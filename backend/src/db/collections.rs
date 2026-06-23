use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{Collection, User},
};

struct CollectionRow {
    id: Uuid,
    workspace_id: Uuid,
    name: String,
    description: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: Option<DateTime<Utc>>,
    created_by_id: String,
    created_by_name: String,
    updated_by_id: Option<String>,
    updated_by_name: Option<String>,
}

impl From<CollectionRow> for Collection {
    fn from(r: CollectionRow) -> Self {
        Collection {
            id: r.id,
            workspace_id: r.workspace_id,
            name: r.name,
            description: r.description,
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

async fn get_row(
    pool: &PgPool,
    workspace_id: Uuid,
    collection_id: Uuid,
) -> Result<Option<CollectionRow>, sqlx::Error> {
    sqlx::query_as!(CollectionRow,
        r#"SELECT
            c.id, c.workspace_id, c.name, c.description, c.created_at, c.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM collections c
        JOIN  users cb ON cb.id = c.created_by
        LEFT JOIN users ub ON ub.id = c.updated_by
        WHERE c.id = $1 AND c.workspace_id = $2"#,
        collection_id, workspace_id
    )
    .fetch_optional(pool)
    .await
}

pub async fn list_for_workspace(
    pool: &PgPool,
    workspace_id: Uuid,
) -> Result<Vec<Collection>, AppError> {
    let rows = sqlx::query_as!(CollectionRow,
        r#"SELECT
            c.id, c.workspace_id, c.name, c.description, c.created_at, c.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM collections c
        JOIN  users cb ON cb.id = c.created_by
        LEFT JOIN users ub ON ub.id = c.updated_by
        WHERE c.workspace_id = $1
        ORDER BY c.created_at"#,
        workspace_id
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Collection::from).collect())
}

pub async fn get(
    pool: &PgPool,
    workspace_id: Uuid,
    collection_id: Uuid,
) -> Result<Option<Collection>, AppError> {
    Ok(get_row(pool, workspace_id, collection_id).await?.map(Collection::from))
}

pub async fn create(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
    name: &str,
    description: Option<&str>,
) -> Result<Collection, AppError> {
    let id = sqlx::query_scalar!(
        "INSERT INTO collections (workspace_id, name, description, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id",
        workspace_id, name, description, user_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() =>
            AppError::Conflict("a collection with this name already exists in this workspace".to_string()),
        _ => AppError::Sqlx(e),
    })?;

    get(pool, workspace_id, id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))
}

pub async fn update(
    pool: &PgPool,
    workspace_id: Uuid,
    collection_id: Uuid,
    name: Option<&str>,
    description: Option<Option<&str>>,
    updated_by: &str,
) -> Result<Collection, AppError> {
    let (update_desc, desc_value) = match description {
        Some(d) => (true, d),
        None => (false, None),
    };

    sqlx::query!(
        "UPDATE collections
         SET name        = COALESCE($2, name),
             description = CASE WHEN $3::bool THEN $4::text ELSE description END,
             updated_by  = $5,
             updated_at  = NOW()
         WHERE id = $1",
        collection_id, name, update_desc, desc_value, updated_by
    )
    .execute(pool)
    .await?;

    get(pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))
}

pub async fn delete(pool: &PgPool, collection_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("DELETE FROM collections WHERE id = $1", collection_id)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::{cleanup_user, seed_collection, seed_user, seed_workspace, test_pool};

    #[tokio::test]
    async fn create_and_get() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let c = create(&pool, ws_id, &user_id, "Sprint 1", Some("desc")).await.unwrap();
        assert_eq!(c.name, "Sprint 1");
        assert_eq!(c.workspace_id, ws_id);
        assert_eq!(c.description.as_deref(), Some("desc"));
        assert_eq!(c.created_by.id, user_id);

        let fetched = get(&pool, ws_id, c.id).await.unwrap().expect("should exist");
        assert_eq!(fetched.id, c.id);

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn get_returns_none_for_wrong_workspace() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let c = create(&pool, ws_id, &user_id, "C", None).await.unwrap();
        let other_ws = Uuid::new_v4();
        assert!(get(&pool, other_ws, c.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn list_for_workspace_returns_all() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        create(&pool, ws_id, &user_id, "C1", None).await.unwrap();
        create(&pool, ws_id, &user_id, "C2", None).await.unwrap();

        let list = list_for_workspace(&pool, ws_id).await.unwrap();
        assert_eq!(list.len(), 2);

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_name_and_clear_description() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let c = create(&pool, ws_id, &user_id, "Old", Some("to clear")).await.unwrap();
        let updated = update(&pool, ws_id, c.id, Some("New"), Some(None), &user_id).await.unwrap();
        assert_eq!(updated.name, "New");
        assert!(updated.description.is_none());
        assert!(updated.updated_at.is_some());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_omitted_fields_unchanged() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let c = create(&pool, ws_id, &user_id, "Keep", Some("keep me")).await.unwrap();
        let updated = update(&pool, ws_id, c.id, None, None, &user_id).await.unwrap();
        assert_eq!(updated.name, "Keep");
        assert_eq!(updated.description.as_deref(), Some("keep me"));

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn delete_removes_collection() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let c = create(&pool, ws_id, &user_id, "To Delete", None).await.unwrap();
        delete(&pool, c.id).await.unwrap();

        assert!(get(&pool, ws_id, c.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn delete_cascades_to_drawings() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let d = crate::db::drawings::create(&pool, col_id, &user_id, "Child Drawing", None, &[])
            .await
            .unwrap();

        delete(&pool, col_id).await.unwrap();

        assert!(crate::db::drawings::get(&pool, col_id, d.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn create_duplicate_name_returns_conflict() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        create(&pool, ws_id, &user_id, "Duplicate", None).await.unwrap();
        let err = create(&pool, ws_id, &user_id, "Duplicate", None).await.unwrap_err();
        assert!(matches!(err, AppError::Conflict(_)));

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn created_by_reflects_creator_not_workspace_owner() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        // A different user creates the collection in the owner's workspace.
        let col = create(&pool, ws_id, &member_id, "Member's Collection", None).await.unwrap();
        assert_eq!(col.created_by.id, member_id);
        assert_ne!(col.created_by.id, owner_id);

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }
}
