use std::{env, path::PathBuf};

pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub keycloak_jwks_url: String,
    pub keycloak_issuer: String,
    /// When set, only tokens whose `aud` claim contains this value are accepted.
    pub keycloak_audience: Option<String>,
    /// Comma-separated list of allowed origins. Empty string = deny all cross-origin requests.
    pub cors_allowed_origins: String,
    /// Base directory for local drawing file storage.
    pub storage_local_path: PathBuf,
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()?,
            keycloak_jwks_url: required("KEYCLOAK_JWKS_URL")?,
            keycloak_issuer: required("KEYCLOAK_ISSUER")?,
            keycloak_audience: env::var("KEYCLOAK_AUDIENCE").ok(),
            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or_default(),
            storage_local_path: env::var("STORAGE_LOCAL_PATH")
                .unwrap_or_else(|_| "./drawings".to_string())
                .into(),
        })
    }
}

fn required(key: &str) -> Result<String, Box<dyn std::error::Error>> {
    env::var(key).map_err(|_| format!("missing required environment variable: {key}").into())
}
