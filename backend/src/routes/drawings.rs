use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{auth::AuthUser, db, error::AppError, models::Drawing, state::AppState};

#[derive(Deserialize)]
pub(super) struct CreateBody {
    title: String,
    description: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Deserialize)]
pub(super) struct UpdateBody {
    title: Option<String>,
    #[serde(default, deserialize_with = "super::deserialize_optional_field")]
    description: Option<Option<String>>,
    tags: Option<Vec<String>>,
    collection_id: Option<Uuid>,
}

pub async fn list(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Vec<Drawing>>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    let drawings = db::drawings::list_for_collection(&state.pool, collection_id).await?;
    Ok(Json(drawings))
}

pub async fn create(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<CreateBody>,
) -> Result<(StatusCode, Json<Drawing>), AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    if body.title.trim().is_empty() {
        return Err(AppError::UnprocessableEntity(
            "title must not be blank".to_string(),
        ));
    }
    let drawing = db::drawings::create(
        &state.pool,
        collection_id,
        &auth.id,
        &body.title,
        body.description.as_deref(),
        &body.tags,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(drawing)))
}

pub async fn get(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<Json<Drawing>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    // Verify the collection is in this workspace (prevents cross-workspace IDOR).
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    let drawing = db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;
    Ok(Json(drawing))
}

pub async fn update(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
    Json(body): Json<UpdateBody>,
) -> Result<Json<Drawing>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    // When moving to a different collection, verify the target also belongs to this workspace.
    if let Some(new_col_id) = body.collection_id {
        if new_col_id != collection_id {
            db::collections::get(&state.pool, workspace_id, new_col_id)
                .await?
                .ok_or_else(|| {
                    AppError::NotFound("target collection not found in workspace".to_string())
                })?;
        }
    }
    let drawing = db::drawings::update(
        &state.pool,
        collection_id,
        drawing_id,
        body.title.as_deref(),
        body.description.as_ref().map(|d| d.as_deref()),
        body.tags.as_deref(),
        body.collection_id,
        &auth.id,
    )
    .await?;
    Ok(Json(drawing))
}

pub async fn delete(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<StatusCode, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;
    db::drawings::delete(&state.pool, drawing_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
