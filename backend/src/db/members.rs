use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{User, WorkspaceMember, WorkspaceRole},
};

struct MemberRow {
    user_id: String,
    user_name: String,
    role: WorkspaceRole,
    joined_at: DateTime<Utc>,
}

impl From<MemberRow> for WorkspaceMember {
    fn from(r: MemberRow) -> Self {
        WorkspaceMember {
            user: User { id: r.user_id, name: r.user_name },
            role: r.role,
            joined_at: r.joined_at,
        }
    }
}

pub async fn list_for_workspace(
    pool: &PgPool,
    workspace_id: Uuid,
) -> Result<Vec<WorkspaceMember>, AppError> {
    let rows = sqlx::query_as!(MemberRow,
        r#"SELECT
            u.id   AS "user_id!",
            u.name AS "user_name!",
            wm.role AS "role: WorkspaceRole",
            wm.joined_at
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = $1
        ORDER BY wm.joined_at"#,
        workspace_id
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(WorkspaceMember::from).collect())
}

pub async fn get(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
) -> Result<Option<WorkspaceMember>, AppError> {
    Ok(sqlx::query_as!(MemberRow,
        r#"SELECT
            u.id   AS "user_id!",
            u.name AS "user_name!",
            wm.role AS "role: WorkspaceRole",
            wm.joined_at
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = $1 AND wm.user_id = $2"#,
        workspace_id, user_id
    )
    .fetch_optional(pool)
    .await?
    .map(WorkspaceMember::from))
}

pub async fn add(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
    role: WorkspaceRole,
) -> Result<WorkspaceMember, AppError> {
    sqlx::query!(
        r#"INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)"#,
        workspace_id, user_id, role as WorkspaceRole
    )
    .execute(pool)
    .await?;

    get(pool, workspace_id, user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))
}

pub async fn update_role(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
    role: WorkspaceRole,
) -> Result<WorkspaceMember, AppError> {
    sqlx::query!(
        "UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2",
        workspace_id, user_id, role as WorkspaceRole
    )
    .execute(pool)
    .await?;

    get(pool, workspace_id, user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))
}

pub async fn transfer_ownership(
    pool: &PgPool,
    workspace_id: Uuid,
    new_owner_id: &str,
    prev_owner_id: &str,
) -> Result<WorkspaceMember, AppError> {
    let mut tx = pool.begin().await?;

    sqlx::query!(
        "UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2",
        workspace_id, new_owner_id, WorkspaceRole::Owner as WorkspaceRole
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2",
        workspace_id, prev_owner_id, WorkspaceRole::Admin as WorkspaceRole
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    get(pool, workspace_id, new_owner_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))
}

pub async fn remove(pool: &PgPool, workspace_id: Uuid, user_id: &str) -> Result<(), AppError> {
    sqlx::query!(
        "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
        workspace_id, user_id
    )
    .execute(pool)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::{cleanup_user, seed_user, seed_workspace, test_pool};
    use crate::models::WorkspaceRole;

    #[tokio::test]
    async fn owner_created_on_workspace_create() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;

        let owner = get(&pool, ws_id, &user_id).await.unwrap().expect("owner should exist");
        assert!(matches!(owner.role, WorkspaceRole::Owner));

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn add_and_get_member() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        let m = add(&pool, ws_id, &member_id, WorkspaceRole::Member).await.unwrap();
        assert_eq!(m.user.id, member_id);
        assert!(matches!(m.role, WorkspaceRole::Member));

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn list_shows_all_members() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        add(&pool, ws_id, &member_id, WorkspaceRole::Admin).await.unwrap();

        let members = list_for_workspace(&pool, ws_id).await.unwrap();
        assert_eq!(members.len(), 2); // owner + admin

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn promote_member_to_admin() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        add(&pool, ws_id, &member_id, WorkspaceRole::Member).await.unwrap();
        let updated = update_role(&pool, ws_id, &member_id, WorkspaceRole::Admin).await.unwrap();
        assert!(matches!(updated.role, WorkspaceRole::Admin));

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn add_duplicate_member_returns_conflict() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        add(&pool, ws_id, &member_id, WorkspaceRole::Member).await.unwrap();
        let err = add(&pool, ws_id, &member_id, WorkspaceRole::Member)
            .await
            .unwrap_err();

        if let crate::error::AppError::Sqlx(sqlx::Error::Database(ref db_err)) = err {
            assert!(db_err.is_unique_violation());
        } else {
            panic!("expected unique-violation database error, got: {err:?}");
        }

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn transfer_ownership_swaps_roles() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        add(&pool, ws_id, &member_id, WorkspaceRole::Member).await.unwrap();
        let new_owner = transfer_ownership(&pool, ws_id, &member_id, &owner_id).await.unwrap();

        assert!(matches!(new_owner.role, WorkspaceRole::Owner));
        let prev = get(&pool, ws_id, &owner_id).await.unwrap().expect("prev owner should still be a member");
        assert!(matches!(prev.role, WorkspaceRole::Admin));

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }

    #[tokio::test]
    async fn remove_member() {
        let pool = test_pool().await;
        let owner_id = seed_user(&pool).await;
        let member_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &owner_id).await;

        add(&pool, ws_id, &member_id, WorkspaceRole::Member).await.unwrap();
        remove(&pool, ws_id, &member_id).await.unwrap();

        assert!(get(&pool, ws_id, &member_id).await.unwrap().is_none());

        cleanup_user(&pool, &owner_id).await;
        cleanup_user(&pool, &member_id).await;
    }
}
