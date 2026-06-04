pub mod collections;
pub mod drawings;
pub mod members;
#[cfg(test)]
pub mod test_helpers;
pub mod users;
pub mod workspaces;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}
