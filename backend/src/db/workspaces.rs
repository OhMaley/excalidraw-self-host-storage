use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{User, Workspace},
};

struct WorkspaceRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    is_private: bool,
    created_at: DateTime<Utc>,
    updated_at: Option<DateTime<Utc>>,
    created_by_id: String,
    created_by_name: String,
    updated_by_id: Option<String>,
    updated_by_name: Option<String>,
}

impl From<WorkspaceRow> for Workspace {
    fn from(r: WorkspaceRow) -> Self {
        Workspace {
            id: r.id,
            name: r.name,
            description: r.description,
            is_private: r.is_private,
            created_at: r.created_at,
            updated_at: r.updated_at,
            created_by: User { id: r.created_by_id, name: r.created_by_name },
            updated_by: r.updated_by_id.map(|id| User {
                id,
                name: r.updated_by_name.unwrap_or_default(),
            }),
        }
    }
}

async fn get_row(pool: &PgPool, workspace_id: Uuid) -> Result<Option<WorkspaceRow>, sqlx::Error> {
    sqlx::query_as!(WorkspaceRow,
        r#"SELECT
            w.id, w.name, w.description, w.is_private, w.created_at, w.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM workspaces w
        JOIN  users cb ON cb.id = w.created_by
        LEFT JOIN users ub ON ub.id = w.updated_by
        WHERE w.id = $1"#,
        workspace_id
    )
    .fetch_optional(pool)
    .await
}

pub async fn list_for_user(pool: &PgPool, user_id: &str) -> Result<Vec<Workspace>, AppError> {
    let rows = sqlx::query_as!(WorkspaceRow,
        r#"SELECT
            w.id, w.name, w.description, w.is_private, w.created_at, w.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM workspaces w
        JOIN  users cb ON cb.id = w.created_by
        LEFT JOIN users ub ON ub.id = w.updated_by
        WHERE EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = w.id AND wm.user_id = $1
        ) OR (w.is_private AND w.created_by = $1)
        ORDER BY w.created_at"#,
        user_id
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Workspace::from).collect())
}

pub async fn get(pool: &PgPool, workspace_id: Uuid) -> Result<Option<Workspace>, AppError> {
    Ok(get_row(pool, workspace_id).await?.map(Workspace::from))
}

pub async fn create(
    pool: &PgPool,
    user_id: &str,
    name: &str,
    description: Option<&str>,
    is_private: bool,
) -> Result<Workspace, AppError> {
    let mut tx = pool.begin().await?;

    let id = sqlx::query_scalar!(
        "INSERT INTO workspaces (name, description, is_private, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id",
        name, description, is_private, user_id
    )
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')",
        id, user_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    get(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound("workspace not found".to_string()))
}

// description: None = keep existing, Some(None) = clear, Some(Some(v)) = set
// description: None = keep, Some(None) = clear, Some(Some(v)) = set
pub async fn update(
    pool: &PgPool,
    workspace_id: Uuid,
    name: Option<&str>,
    description: Option<Option<&str>>,
    is_private: Option<bool>,
    updated_by: &str,
) -> Result<Workspace, AppError> {
    let (update_desc, desc_value) = match description {
        Some(d) => (true, d),
        None => (false, None),
    };

    sqlx::query!(
        "UPDATE workspaces
         SET name        = COALESCE($2, name),
             description = CASE WHEN $3::bool THEN $4::text ELSE description END,
             is_private   = COALESCE($5, is_private),
             updated_by  = $6,
             updated_at  = NOW()
         WHERE id = $1",
        workspace_id, name, update_desc, desc_value, is_private, updated_by
    )
    .execute(pool)
    .await?;

    get(pool, workspace_id)
        .await?
        .ok_or_else(|| AppError::NotFound("workspace not found".to_string()))
}

pub async fn delete(pool: &PgPool, workspace_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("DELETE FROM workspaces WHERE id = $1", workspace_id)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::{cleanup_user, seed_user, test_pool};

    #[tokio::test]
    async fn create_and_get() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;

        let w = create(&pool, &user_id, "My Workspace", Some("a description"), false).await.unwrap();
        assert_eq!(w.name, "My Workspace");
        assert_eq!(w.description.as_deref(), Some("a description"));
        assert!(!w.is_private);
        assert_eq!(w.created_by.id, user_id);

        let fetched = get(&pool, w.id).await.unwrap().expect("workspace should exist");
        assert_eq!(fetched.id, w.id);

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn list_for_user_includes_own_workspaces() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;

        create(&pool, &user_id, "WS A", None, false).await.unwrap();
        create(&pool, &user_id, "WS B", None, false).await.unwrap();

        let list = list_for_user(&pool, &user_id).await.unwrap();
        assert_eq!(list.len(), 2);

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn list_for_user_includes_member_workspaces() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;

        let ws = create(&pool, &owner_id, "Shared", None, false).await.unwrap();
        crate::db::members::add(&pool, ws.id, &member_id, crate::models::WorkspaceRole::Member)
            .await
            .unwrap();

        let list = list_for_user(&pool, &member_id).await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, ws.id);

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn update_name_and_visibility() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;

        let w = create(&pool, &user_id, "Old Name", None, false).await.unwrap();

        let updated = update(&pool, w.id, Some("New Name"), None, Some(true), &user_id).await.unwrap();
        assert_eq!(updated.name, "New Name");
        assert!(updated.is_private);
        assert!(updated.updated_at.is_some());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_clears_description() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;

        let w = create(&pool, &user_id, "WS", Some("to be cleared"), false).await.unwrap();
        let updated = update(&pool, w.id, None, Some(None), None, &user_id).await.unwrap();
        assert!(updated.description.is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn delete_removes_workspace() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;

        let w = create(&pool, &user_id, "To Delete", None, false).await.unwrap();
        delete(&pool, w.id).await.unwrap();

        assert!(get(&pool, w.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }
}
