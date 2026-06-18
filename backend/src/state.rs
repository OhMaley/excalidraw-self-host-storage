use sqlx::PgPool;

use crate::auth::JwksStore;
use crate::storage::StorageBackend;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwks: JwksStore,
    pub storage: StorageBackend,
}
