use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{Drawing, User},
};

struct DrawingRow {
    id: Uuid,
    collection_id: Uuid,
    title: String,
    description: Option<String>,
    tags: Vec<String>,
    created_at: DateTime<Utc>,
    updated_at: Option<DateTime<Utc>>,
    created_by_id: String,
    created_by_name: String,
    updated_by_id: Option<String>,
    updated_by_name: Option<String>,
}

impl From<DrawingRow> for Drawing {
    fn from(r: DrawingRow) -> Self {
        Drawing {
            id: r.id,
            collection_id: r.collection_id,
            title: r.title,
            description: r.description,
            tags: r.tags,
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
    collection_id: Uuid,
    drawing_id: Uuid,
) -> Result<Option<DrawingRow>, sqlx::Error> {
    sqlx::query_as!(DrawingRow,
        r#"SELECT
            d.id, d.collection_id, d.title, d.description, d.tags, d.created_at, d.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM drawings d
        JOIN  users cb ON cb.id = d.created_by
        LEFT JOIN users ub ON ub.id = d.updated_by
        WHERE d.id = $1 AND d.collection_id = $2"#,
        drawing_id, collection_id
    )
    .fetch_optional(pool)
    .await
}

pub async fn list_for_collection(
    pool: &PgPool,
    collection_id: Uuid,
) -> Result<Vec<Drawing>, AppError> {
    let rows = sqlx::query_as!(DrawingRow,
        r#"SELECT
            d.id, d.collection_id, d.title, d.description, d.tags, d.created_at, d.updated_at,
            cb.id   AS "created_by_id!",
            cb.name AS "created_by_name!",
            ub.id   AS "updated_by_id?",
            ub.name AS "updated_by_name?"
        FROM drawings d
        JOIN  users cb ON cb.id = d.created_by
        LEFT JOIN users ub ON ub.id = d.updated_by
        WHERE d.collection_id = $1
        ORDER BY d.created_at DESC"#,
        collection_id
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Drawing::from).collect())
}

pub async fn get(
    pool: &PgPool,
    collection_id: Uuid,
    drawing_id: Uuid,
) -> Result<Option<Drawing>, AppError> {
    Ok(get_row(pool, collection_id, drawing_id).await?.map(Drawing::from))
}

pub async fn create(
    pool: &PgPool,
    collection_id: Uuid,
    user_id: &str,
    title: &str,
    description: Option<&str>,
    tags: &[String],
) -> Result<Drawing, AppError> {
    let id = sqlx::query_scalar!(
        "INSERT INTO drawings (collection_id, title, description, tags, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id",
        collection_id, title, description, tags, user_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() =>
            AppError::Conflict("a drawing with this title already exists in this collection".to_string()),
        _ => AppError::Sqlx(e),
    })?;

    get(pool, collection_id, id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))
}

// description: None = keep, Some(None) = clear, Some(Some(v)) = set
pub async fn update(
    pool: &PgPool,
    collection_id: Uuid,
    drawing_id: Uuid,
    title: Option<&str>,
    description: Option<Option<&str>>,
    tags: Option<&[String]>,
    new_collection_id: Option<Uuid>,
    updated_by: &str,
) -> Result<Drawing, AppError> {
    let (update_desc, desc_value) = match description {
        Some(d) => (true, d),
        None => (false, None),
    };
    let effective_collection_id = new_collection_id.unwrap_or(collection_id);

    sqlx::query!(
        "UPDATE drawings
         SET title         = COALESCE($2, title),
             description   = CASE WHEN $3::bool THEN $4::text ELSE description END,
             tags          = COALESCE($5, tags),
             collection_id = $6,
             updated_by    = $7,
             updated_at    = NOW()
         WHERE id = $1",
        drawing_id, title, update_desc, desc_value, tags, effective_collection_id, updated_by
    )
    .execute(pool)
    .await?;

    get(pool, effective_collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))
}

pub async fn delete(pool: &PgPool, drawing_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("DELETE FROM drawings WHERE id = $1", drawing_id)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::{
        cleanup_user, seed_collection, seed_user, seed_workspace, test_pool,
    };

    #[tokio::test]
    async fn create_and_get() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let tags = vec!["wireframe".to_string(), "homepage".to_string()];
        let d = create(&pool, col_id, &user_id, "Login page", Some("desc"), &tags).await.unwrap();
        assert_eq!(d.title, "Login page");
        assert_eq!(d.tags, tags);
        assert_eq!(d.collection_id, col_id);
        assert_eq!(d.created_by.id, user_id);

        let fetched = get(&pool, col_id, d.id).await.unwrap().expect("should exist");
        assert_eq!(fetched.id, d.id);

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn get_returns_none_for_wrong_collection() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let d = create(&pool, col_id, &user_id, "D", None, &[]).await.unwrap();

        let wrong_col = uuid::Uuid::new_v4();
        assert!(get(&pool, wrong_col, d.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn list_ordered_by_created_at_desc() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        create(&pool, col_id, &user_id, "First", None, &[]).await.unwrap();
        create(&pool, col_id, &user_id, "Second", None, &[]).await.unwrap();

        let list = list_for_collection(&pool, col_id).await.unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].title, "Second"); // DESC order

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_title_and_tags() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let d = create(&pool, col_id, &user_id, "Old Title", None, &[]).await.unwrap();
        let new_tags = vec!["updated".to_string()];
        let updated = update(
            &pool, col_id, d.id,
            Some("New Title"), None, Some(&new_tags), None,
            &user_id,
        ).await.unwrap();

        assert_eq!(updated.title, "New Title");
        assert_eq!(updated.tags, new_tags);
        assert!(updated.updated_at.is_some());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_moves_to_other_collection() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_a = seed_collection(&pool, ws_id, &user_id).await;
        let col_b = seed_collection(&pool, ws_id, &user_id).await;

        let d = create(&pool, col_a, &user_id, "Moving", None, &[]).await.unwrap();
        let moved = update(&pool, col_a, d.id, None, None, None, Some(col_b), &user_id).await.unwrap();
        assert_eq!(moved.collection_id, col_b);
        assert!(get(&pool, col_a, d.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn update_clears_description() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let d = create(&pool, col_id, &user_id, "T", Some("to clear"), &[]).await.unwrap();
        let updated = update(&pool, col_id, d.id, None, Some(None), None, None, &user_id).await.unwrap();
        assert!(updated.description.is_none());

        cleanup_user(&pool, &user_id).await;
    }

    #[tokio::test]
    async fn delete_removes_drawing() {
        let pool = test_pool().await;
        let user_id = seed_user(&pool).await;
        let ws_id = seed_workspace(&pool, &user_id).await;
        let col_id = seed_collection(&pool, ws_id, &user_id).await;

        let d = create(&pool, col_id, &user_id, "To Delete", None, &[]).await.unwrap();
        delete(&pool, d.id).await.unwrap();
        assert!(get(&pool, col_id, d.id).await.unwrap().is_none());

        cleanup_user(&pool, &user_id).await;
    }
}
