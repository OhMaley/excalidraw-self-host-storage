use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub(crate) struct Health {
    status: &'static str,
}

pub async fn liveness() -> Json<Health> {
    Json(Health { status: "ok" })
}

pub async fn readiness(State(state): State<AppState>) -> (StatusCode, Json<Health>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (StatusCode::OK, Json(Health { status: "ok" })),
        Err(e) => {
            tracing::error!(error = ?e, "database health check failed");
            (StatusCode::SERVICE_UNAVAILABLE, Json(Health { status: "error" }))
        }
    }
}
