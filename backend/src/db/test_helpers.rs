//! Shared utilities for database integration tests.

use sqlx::PgPool;
use uuid::Uuid;

pub async fn test_pool() -> PgPool {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set for tests");
    PgPool::connect(&url).await.expect("failed to connect to test database")
}

pub async fn seed_user(pool: &PgPool) -> String {
    let id = format!("test-{}", Uuid::new_v4());
    sqlx::query!("INSERT INTO users (id, name) VALUES ($1, 'Test User')", id)
        .execute(pool)
        .await
        .expect("failed to seed test user");
    id
}

pub async fn seed_workspace(pool: &PgPool, user_id: &str) -> Uuid {
    crate::db::workspaces::create(pool, user_id, "Test Workspace", None, false)
        .await
        .expect("failed to seed test workspace")
        .id
}

pub async fn seed_collection(pool: &PgPool, workspace_id: Uuid, user_id: &str) -> Uuid {
    let name = format!("Test Collection {}", Uuid::new_v4());
    crate::db::collections::create(pool, workspace_id, user_id, &name, None)
        .await
        .expect("failed to seed test collection")
        .id
}

/// Deletes all data owned by or associated with the user.
/// Safe to call in any order — workspaces cascade to collections, drawings, and members.
pub async fn cleanup_user(pool: &PgPool, user_id: &str) {
    sqlx::query!("DELETE FROM workspace_members WHERE user_id = $1", user_id)
        .execute(pool).await.ok();
    sqlx::query!("DELETE FROM workspaces WHERE created_by = $1", user_id)
        .execute(pool).await.ok();
    sqlx::query!("DELETE FROM users WHERE id = $1", user_id)
        .execute(pool).await.ok();
}
