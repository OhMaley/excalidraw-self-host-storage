use sqlx::PgPool;

use crate::auth::JwksStore;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwks: JwksStore,
}
