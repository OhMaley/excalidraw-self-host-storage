mod collections;
mod drawings;
mod guards;
mod health;
mod members;
mod workspaces;

use guards::{deserialize_optional_field, require_admin, require_member, require_owner};

use axum::{extract::DefaultBodyLimit, routing::get, Router};

use crate::state::AppState;

/// Maximum allowed body for a drawing's JSON content (includes base64-encoded embedded images).
const DRAWING_CONTENT_LIMIT: usize = 10 * 1024 * 1024; // 10 MB
/// Maximum allowed body for a thumbnail upload.
const THUMBNAIL_LIMIT: usize = 2 * 1024 * 1024; // 2 MB

pub fn build_router() -> Router<AppState> {
    let workspace_routes = Router::new()
        .route("/", get(workspaces::list).post(workspaces::create))
        .route(
            "/{workspace_id}",
            get(workspaces::get)
                .patch(workspaces::update)
                .delete(workspaces::delete),
        )
        .route(
            "/{workspace_id}/members",
            get(members::list).post(members::add),
        )
        .route(
            "/{workspace_id}/members/me",
            get(members::get_me).delete(members::leave),
        )
        .route(
            "/{workspace_id}/members/{member_id}",
            get(members::get_one)
                .patch(members::update_role)
                .delete(members::remove),
        )
        .route(
            "/{workspace_id}/collections",
            get(collections::list).post(collections::create),
        )
        .route(
            "/{workspace_id}/collections/{collection_id}",
            get(collections::get)
                .patch(collections::update)
                .delete(collections::delete),
        )
        .route(
            "/{workspace_id}/collections/{collection_id}/drawings",
            get(drawings::list).post(drawings::create),
        )
        .route(
            "/{workspace_id}/collections/{collection_id}/drawings/{drawing_id}",
            get(drawings::get)
                .patch(drawings::update)
                .delete(drawings::delete),
        )
        .route(
            "/{workspace_id}/collections/{collection_id}/drawings/{drawing_id}/content",
            get(drawings::get_content)
                .put(drawings::put_content)
                .layer(DefaultBodyLimit::max(DRAWING_CONTENT_LIMIT)),
        )
        .route(
            "/{workspace_id}/collections/{collection_id}/drawings/{drawing_id}/thumbnail",
            get(drawings::get_thumbnail)
                .put(drawings::put_thumbnail)
                .layer(DefaultBodyLimit::max(THUMBNAIL_LIMIT)),
        );

    Router::new()
        .route("/health", get(health::liveness))
        .route("/health/db", get(health::readiness))
        .nest("/workspaces", workspace_routes)
}
