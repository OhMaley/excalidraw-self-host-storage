use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

use crate::{auth::AuthUser, db, error::AppError, models::{Drawing, WorkspaceRole}, state::AppState};

// Ensures the `files` key is always present in stored drawing JSON, defaulting to `{}`.
// Drawings saved before this field was introduced may omit it, which breaks the frontend.
fn ensure_files_field(bytes: Vec<u8>) -> Result<Bytes, AppError> {
    let mut value: Value = serde_json::from_slice(&bytes)
        .map_err(|e| AppError::Internal(format!("invalid drawing JSON: {e}")))?;
    if let Some(obj) = value.as_object_mut() {
        obj.entry("files").or_insert(Value::Object(Default::default()));
    }
    let vec = serde_json::to_vec(&value)
        .map_err(|e| AppError::Internal(format!("failed to serialize drawing: {e}")))?;
    Ok(Bytes::from(vec))
}

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
    // Verify the collection is in this workspace (prevents cross-workspace Insecure Direct Object Reference).
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
    let member = super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let col = db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    let drawing = db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;
    if member.role != WorkspaceRole::Owner
        && drawing.created_by.id != auth.id
        && col.created_by.id != auth.id
    {
        return Err(AppError::Forbidden(
            "only the workspace owner, collection creator, or drawing creator can delete a drawing"
                .to_string(),
        ));
    }
    db::drawings::delete(&state.pool, drawing_id).await?;
    if let Err(e) = state.storage.delete(drawing_id).await {
        tracing::error!(drawing_id = %drawing_id, error = %e, "orphaned drawing content file remains on disk — manual cleanup required");
    }
    if let Err(e) = state.storage.delete_thumbnail(drawing_id).await {
        tracing::error!(drawing_id = %drawing_id, error = %e, "orphaned drawing thumbnail file remains on disk — manual cleanup required");
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_content(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;

    match state.storage.load(drawing_id).await.map_err(|e| AppError::Internal(e.to_string()))? {
        Some(bytes) => {
            let body = ensure_files_field(bytes)?;
            Ok((
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/json")],
                body,
            )
                .into_response())
        }
        None => Ok(StatusCode::NO_CONTENT.into_response()),
    }
}

pub async fn put_content(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;

    state.storage.save(drawing_id, &body).await.map_err(|e| AppError::Internal(e.to_string()))?;
    db::drawings::touch(&state.pool, drawing_id, &auth.id).await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_thumbnail(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;

    match state.storage.load_thumbnail(drawing_id).await.map_err(|e| AppError::Internal(e.to_string()))? {
        Some(bytes) => Ok((
            StatusCode::OK,
            [(header::CONTENT_TYPE, "image/png")],
            Bytes::from(bytes),
        )
            .into_response()),
        None => Ok(StatusCode::NOT_FOUND.into_response()),
    }
}

pub async fn put_thumbnail(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, collection_id, drawing_id)): Path<(Uuid, Uuid, Uuid)>,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    db::collections::get(&state.pool, workspace_id, collection_id)
        .await?
        .ok_or_else(|| AppError::NotFound("collection not found".to_string()))?;
    db::drawings::get(&state.pool, collection_id, drawing_id)
        .await?
        .ok_or_else(|| AppError::NotFound("drawing not found".to_string()))?;

    state.storage.save_thumbnail(drawing_id, &body).await.map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
