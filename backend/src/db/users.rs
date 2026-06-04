use sqlx::PgPool;

use crate::error::AppError;

/// Inserts or updates the user record. Returns `true` if the user was
/// newly created (first login), `false` if they already existed.
pub async fn upsert(pool: &PgPool, id: &str, name: &str) -> Result<bool, AppError> {
    let inserted = sqlx::query!(
        "INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
        id,
        name
    )
    .execute(pool)
    .await?
    .rows_affected()
        == 1;

    if !inserted {
        sqlx::query!("UPDATE users SET name = $2 WHERE id = $1", id, name)
            .execute(pool)
            .await?;
    }

    Ok(inserted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::{cleanup_user, test_pool};

    #[tokio::test]
    async fn inserts_new_user() {
        let pool = test_pool().await;
        let id = format!("test-{}", uuid::Uuid::new_v4());

        let is_new = upsert(&pool, &id, "Alice").await.unwrap();
        assert!(is_new);

        let name: String = sqlx::query_scalar!("SELECT name FROM users WHERE id = $1", id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(name, "Alice");

        cleanup_user(&pool, &id).await;
    }

    #[tokio::test]
    async fn first_login_creates_personal_workspace() {
        let pool = test_pool().await;
        let id = format!("test-{}", uuid::Uuid::new_v4());

        let is_new = upsert(&pool, &id, "Alice").await.unwrap();
        assert!(is_new);

        // Mirrors what auth::from_request_parts does after a new upsert.
        crate::db::workspaces::create(&pool, &id, "Personal", None, true)
            .await
            .unwrap();

        let workspaces = crate::db::workspaces::list_for_user(&pool, &id).await.unwrap();
        assert_eq!(workspaces.len(), 1);
        assert_eq!(workspaces[0].name, "Personal");
        assert!(workspaces[0].is_private);

        cleanup_user(&pool, &id).await;
    }

    #[tokio::test]
    async fn returning_login_skips_workspace_creation() {
        let pool = test_pool().await;
        let id = format!("test-{}", uuid::Uuid::new_v4());

        // First login — creates the workspace.
        let is_new = upsert(&pool, &id, "Alice").await.unwrap();
        assert!(is_new);
        crate::db::workspaces::create(&pool, &id, "Personal", None, true)
            .await
            .unwrap();

        // Second login — the guard must NOT create a second workspace.
        let is_new = upsert(&pool, &id, "Alice").await.unwrap();
        assert!(!is_new);
        // (auth skips create because is_new is false)

        let workspaces = crate::db::workspaces::list_for_user(&pool, &id).await.unwrap();
        assert_eq!(workspaces.len(), 1, "second login must not create a duplicate workspace");

        cleanup_user(&pool, &id).await;
    }

    #[tokio::test]
    async fn updates_name_on_conflict() {
        let pool = test_pool().await;
        let id = format!("test-{}", uuid::Uuid::new_v4());

        let is_new = upsert(&pool, &id, "Alice").await.unwrap();
        assert!(is_new);

        let is_new = upsert(&pool, &id, "Alice Renamed").await.unwrap();
        assert!(!is_new);

        let name: String = sqlx::query_scalar!("SELECT name FROM users WHERE id = $1", id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(name, "Alice Renamed");

        cleanup_user(&pool, &id).await;
    }
}
