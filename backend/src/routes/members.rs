use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    db,
    error::AppError,
    models::{WorkspaceMember, WorkspaceRole},
    state::AppState,
};

/// Role values accepted in request bodies — excludes `owner`,
/// which can only be assigned at workspace creation.
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum NonOwnerRole {
    Admin,
    Member,
}

impl From<NonOwnerRole> for WorkspaceRole {
    fn from(r: NonOwnerRole) -> Self {
        match r {
            NonOwnerRole::Admin => WorkspaceRole::Admin,
            NonOwnerRole::Member => WorkspaceRole::Member,
        }
    }
}

#[derive(Deserialize)]
pub(super) struct AddBody {
    user_id: String,
    role: NonOwnerRole,
}

#[derive(Deserialize)]
pub(super) struct UpdateRoleBody {
    role: WorkspaceRole,
}

pub async fn list(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<Json<Vec<WorkspaceMember>>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let members = db::members::list_for_workspace(&state.pool, workspace_id).await?;
    Ok(Json(members))
}

pub async fn add(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
    Json(body): Json<AddBody>,
) -> Result<(StatusCode, Json<WorkspaceMember>), AppError> {
    super::require_admin(&state.pool, workspace_id, &auth.id).await?;
    let member = db::members::add(&state.pool, workspace_id, &body.user_id, body.role.into()).await?;
    Ok((StatusCode::CREATED, Json(member)))
}

pub async fn get_me(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<Json<WorkspaceMember>, AppError> {
    let m = super::require_member(&state.pool, workspace_id, &auth.id).await?;
    Ok(Json(m))
}

pub async fn leave(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let m = super::require_member(&state.pool, workspace_id, &auth.id).await?;
    if matches!(m.role, WorkspaceRole::Owner) {
        return Err(AppError::Forbidden(
            "owner cannot leave; transfer ownership first".to_string(),
        ));
    }
    db::members::remove(&state.pool, workspace_id, &auth.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_one(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, member_id)): Path<(Uuid, String)>,
) -> Result<Json<WorkspaceMember>, AppError> {
    super::require_member(&state.pool, workspace_id, &auth.id).await?;
    let m = db::members::get(&state.pool, workspace_id, &member_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))?;
    Ok(Json(m))
}

pub async fn update_role(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, member_id)): Path<(Uuid, String)>,
    Json(body): Json<UpdateRoleBody>,
) -> Result<Json<WorkspaceMember>, AppError> {
    if matches!(body.role, WorkspaceRole::Owner) {
        super::require_owner(&state.pool, workspace_id, &auth.id).await?;
        if auth.id == member_id {
            return Err(AppError::UnprocessableEntity(
                "already the owner".to_string(),
            ));
        }
        db::members::get(&state.pool, workspace_id, &member_id)
            .await?
            .ok_or_else(|| AppError::NotFound("member not found".to_string()))?;
        let updated = db::members::transfer_ownership(
            &state.pool, workspace_id, &member_id, &auth.id,
        )
        .await?;
        return Ok(Json(updated));
    }

    super::require_admin(&state.pool, workspace_id, &auth.id).await?;
    let target = db::members::get(&state.pool, workspace_id, &member_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))?;
    if matches!(target.role, WorkspaceRole::Owner) {
        return Err(AppError::Forbidden(
            "cannot change the owner's role; transfer ownership instead".to_string(),
        ));
    }
    let updated =
        db::members::update_role(&state.pool, workspace_id, &member_id, body.role).await?;
    Ok(Json(updated))
}

pub async fn remove(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((workspace_id, member_id)): Path<(Uuid, String)>,
) -> Result<StatusCode, AppError> {
    super::require_admin(&state.pool, workspace_id, &auth.id).await?;
    let target = db::members::get(&state.pool, workspace_id, &member_id)
        .await?
        .ok_or_else(|| AppError::NotFound("member not found".to_string()))?;
    if matches!(target.role, WorkspaceRole::Owner) {
        return Err(AppError::Forbidden(
            "cannot remove the workspace owner".to_string(),
        ));
    }
    db::members::remove(&state.pool, workspace_id, &member_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
