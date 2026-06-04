use sqlx::PgPool;
use uuid::Uuid;

use crate::{db, error::AppError, models::WorkspaceRole};

/// Returns `Ok(member)` if `user_id` belongs to `workspace_id`.
/// Returns 404 if the workspace doesn't exist, 403 if the user is not a member.
pub(super) async fn require_member(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
) -> Result<crate::models::WorkspaceMember, AppError> {
    match db::members::get(pool, workspace_id, user_id).await? {
        Some(m) => Ok(m),
        None => {
            if db::workspaces::get(pool, workspace_id).await?.is_none() {
                Err(AppError::NotFound("workspace not found".to_string()))
            } else {
                Err(AppError::Forbidden(
                    "not a member of this workspace".to_string(),
                ))
            }
        }
    }
}

/// Returns `Ok(())` if `user_id` is an admin or owner of `workspace_id`.
pub(super) async fn require_admin(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
) -> Result<(), AppError> {
    let m = require_member(pool, workspace_id, user_id).await?;
    match m.role {
        WorkspaceRole::Owner | WorkspaceRole::Admin => Ok(()),
        WorkspaceRole::Member => {
            Err(AppError::Forbidden("admin or owner role required".to_string()))
        }
    }
}

/// Returns `Ok(())` if `user_id` is the owner of `workspace_id`.
pub(super) async fn require_owner(
    pool: &PgPool,
    workspace_id: Uuid,
    user_id: &str,
) -> Result<(), AppError> {
    let m = require_member(pool, workspace_id, user_id).await?;
    match m.role {
        WorkspaceRole::Owner => Ok(()),
        _ => Err(AppError::Forbidden("owner role required".to_string())),
    }
}

/// Deserializes a nullable optional JSON field into `Option<Option<T>>`:
/// - Field absent → `None`        (leave unchanged)
/// - `null`        → `Some(None)` (clear the field)
/// - `"value"`     → `Some(Some(value))` (set the field)
pub(super) fn deserialize_optional_field<'de, D, T>(
    deserializer: D,
) -> Result<Option<Option<T>>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de>,
{
    use serde::Deserialize;
    Ok(Some(Option::deserialize(deserializer)?))
}
