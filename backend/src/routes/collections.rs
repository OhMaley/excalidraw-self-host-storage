use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{auth::AuthUser, db, error::AppError, models::{Collection, WorkspaceRole}, state::AppState};

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
    Path(workspace_id): Path<Uuid>,
) -> Result<Json<Vec<Collection>>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let collections = db::collections::list_for_workspace(&state.pool, workspace_id).await?;
    Ok(Json(collections))
}

pub async fn create(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
    Json(body): Json<CreateBody>,
) -> Result<(StatusCode, Json<Collection>), AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    if body.name.trim().is_empty() {
        return Err(AppError::UnprocessableEntity(
            "name must not be blank".to_string(),
        ));
    }
    let col = db::collections::create(
        &state.pool,
        workspace_id,
        &auth.id,
        &body.name,
        body.description.as_deref(),
    )
    .await?;
    Ok((StatusCode::CREATED, Json(col)))
}

pub async fn get(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Collection>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let col = db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    Ok(Json(col))
}

pub async fn update(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateBody>,
) -> Result<Json<Collection>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let col = db::collections::update(
        &state.pool,
        workspace_id,
        collection_id,
        body.name.as_deref(),
        body.description.as_ref().map(|d| d.as_deref()),
        &auth.id,
    )
    .await?;
    Ok(Json(col))
}

pub async fn delete(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, AppError> {
    let member = super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let col = db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    if member.role != WorkspaceRole::Owner && col.created_by.id != auth.id {
        return Err(AppError::Forbidden(
            "only the workspace owner or collection creator can delete a collection".to_string(),
        ));
    }
    db::collections::delete(&state.pool, collection_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
