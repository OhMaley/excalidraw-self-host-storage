mod collections;
mod drawings;
mod guards;
mod health;
mod members;
mod workspaces;

use guards::{deserialize_optional_field, require_admin, require_member, require_owner};

use axum::{routing::get, Router};

use crate::state::AppState;

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
            get(drawings::get_content).put(drawings::put_content),
        );

    Router::new()
        .route("/health", get(health::liveness))
        .route("/health/db", get(health::readiness))
        .nest("/workspaces", workspace_routes)
}
