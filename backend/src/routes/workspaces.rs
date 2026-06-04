use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{auth::AuthUser, db, error::AppError, models::Workspace, state::AppState};

#[derive(Deserialize)]
pub(super) struct CreateBody {
    name: String,
    description: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct UpdateBody {
    name: Option<String>,
    #[serde(default, deserialize_with = "super::deserialize_optional_field")]
    description: Option<Option<String>>,
}

pub async fn list(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<Workspace>>, AppError> {
    let workspaces = db::workspaces::list_for_user(&state.pool, &auth.id).await?;
    Ok(Json(workspaces))
}

pub async fn create(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateBody>,
) -> Result<(StatusCode, Json<Workspace>), AppError> {
    if body.name.trim().is_empty() {
        return Err(AppError::UnprocessableEntity(
            "name must not be blank".to_string(),
        ));
    }
    let ws = db::workspaces::create(
        &state.pool,
        &auth.id,
        &body.name,
        body.description.as_deref(),
        false,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(ws)))
}

pub async fn get(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<Json<Workspace>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let ws = db::workspaces::get(&state.pool, workspace_id)
        .await?
        .ok_or_else(|| AppError::NotFound("workspace not found".to_string()))?;
    Ok(Json(ws))
}

pub async fn update(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
    Json(body): Json<UpdateBody>,
) -> Result<Json<Workspace>, AppError> {
    super::require_admin(&state.pool, workspace_id, &auth.id).await?;
    let ws = db::workspaces::update(
        &state.pool,
        workspace_id,
        body.name.as_deref(),
        body.description.as_ref().map(|d| d.as_deref()),
        &auth.id,
    )
    .await?;
    Ok(Json(ws))
}

pub async fn delete(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    super::require_owner(&state.pool, workspace_id, &auth.id).await?;
    let ws = db::workspaces::get(&state.pool, workspace_id)
        .await?
        .ok_or_else(|| AppError::NotFound("workspace not found".to_string()))?;
    if ws.is_private {
        return Err(AppError::Forbidden(
            "private workspaces cannot be deleted".to_string(),
        ));
    }
    db::workspaces::delete(&state.pool, workspace_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
