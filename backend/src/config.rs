use std::env;

pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub keycloak_jwks_url: String,
    pub keycloak_issuer: String,
    /// Comma-separated list of allowed origins, or `*` to allow all.
    pub cors_allowed_origins: String,
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
            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or_else(|_| "*".to_string()),
        })
    }
}

fn required(key: &str) -> Result<String, Box<dyn std::error::Error>> {
    env::var(key).map_err(|_| format!("missing required environment variable: {key}").into())
}
