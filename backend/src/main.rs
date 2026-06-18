mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;
mod state;
mod storage;

use axum::http::{header, Method};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::Level;
use tracing_subscriber::EnvFilter;

use auth::JwksStore;
use state::AppState;
use storage::StorageBackend;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = config::Config::load()?;

    let pool = db::create_pool(&config.database_url).await?;
    tracing::info!("connected to database");

    let jwks = JwksStore::new(config.keycloak_jwks_url, config.keycloak_issuer);
    jwks.prefetch().await?;
    tracing::info!("JWKS keys loaded");

    let storage = StorageBackend::local(config.storage_local_path);
    storage.init().await?;
    tracing::info!("storage initialized");

    let state = AppState { pool, jwks, storage };

    let cors = build_cors(&config.cors_allowed_origins);
    let trace = TraceLayer::new_for_http()
        .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
        .on_response(DefaultOnResponse::new().level(Level::INFO));

    let app = routes::build_router()
        .with_state(state)
        .layer(cors)
        .layer(trace);

    let listener = tokio::net::TcpListener::bind(
        format!("0.0.0.0:{}", config.port)
    ).await?;

    tracing::info!("listening on port {}", config.port);
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_cors(allowed_origins: &str) -> CorsLayer {
    let methods = [Method::GET, Method::POST, Method::PATCH, Method::PUT, Method::DELETE];
    let headers = [header::AUTHORIZATION, header::CONTENT_TYPE];

    if allowed_origins == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(methods)
            .allow_headers(headers)
    } else {
        let origins = allowed_origins
            .split(',')
            .filter_map(|o| o.trim().parse().ok())
            .collect::<Vec<_>>();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(methods)
            .allow_headers(headers)
    }
}
