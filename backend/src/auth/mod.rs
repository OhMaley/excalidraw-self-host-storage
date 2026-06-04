mod jwks;

pub use jwks::JwksStore;

use axum::{extract::FromRequestParts, http::request::Parts};

use crate::{db, error::AppError, state::AppState};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, AppError> {
        let token = bearer_token(parts)?;
        let claims = state.jwks.validate(token).await?;

        let name = claims.name
            .or(claims.preferred_username)
            .unwrap_or_else(|| claims.sub.clone());

        let is_new = db::users::upsert(&state.pool, &claims.sub, &name).await?;
        if is_new {
            db::workspaces::create(&state.pool, &claims.sub, "Personal", None, true).await?;
        }

        Ok(AuthUser { id: claims.sub })
    }
}

fn bearer_token(parts: &Parts) -> Result<&str, AppError> {
    parts
        .headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)
}
