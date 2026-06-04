use std::collections::HashMap;
use std::sync::Arc;

use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation, jwk::JwkSet};
use serde::Deserialize;
use tokio::sync::RwLock;

use crate::error::AppError;

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub name: Option<String>,
    pub preferred_username: Option<String>,
}

#[derive(Clone)]
pub struct JwksStore(Arc<Inner>);

struct Inner {
    jwks_url: String,
    client: reqwest::Client,
    keys: RwLock<HashMap<String, DecodingKey>>,
    validation: Validation,
}

impl JwksStore {
    pub fn new(jwks_url: String, issuer: String) -> Self {
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[issuer]);
        validation.validate_aud = false;

        JwksStore(Arc::new(Inner {
            jwks_url,
            client: reqwest::Client::new(),
            keys: RwLock::new(HashMap::new()),
            validation,
        }))
    }

    /// Fetches keys on startup so the first request does not pay the cost.
    pub async fn prefetch(&self) -> Result<(), AppError> {
        self.refresh().await
    }

    async fn refresh(&self) -> Result<(), AppError> {
        let body = self
            .0
            .client
            .get(&self.0.jwks_url)
            .send()
            .await
            .map_err(|e| {
                tracing::error!(url = %self.0.jwks_url, error = ?e, "failed to fetch JWKS");
                AppError::Unauthorized
            })?
            .text()
            .await
            .map_err(|e| {
                tracing::error!(error = ?e, "failed to read JWKS response body");
                AppError::Unauthorized
            })?;

        let jwks: JwkSet = serde_json::from_str(&body).map_err(|e| {
            tracing::error!(error = ?e, body = %body, "failed to parse JWKS response");
            AppError::Unauthorized
        })?;

        let mut keys = self.0.keys.write().await;
        keys.clear();
        for jwk in &jwks.keys {
            if let (Some(kid), Ok(key)) = (
                jwk.common.key_id.clone(),
                DecodingKey::from_jwk(jwk),
            ) {
                keys.insert(kid, key);
            }
        }

        tracing::info!(count = keys.len(), "JWKS keys loaded");
        Ok(())
    }

    pub async fn validate(&self, token: &str) -> Result<Claims, AppError> {
        let kid = decode_header(token)
            .map_err(|_| AppError::Unauthorized)?
            .kid
            .ok_or(AppError::Unauthorized)?;

        // Try cached keys first; on miss refresh once and retry.
        if let Some(claims) = self.try_decode(token, &kid).await {
            return Ok(claims);
        }

        self.refresh().await?;
        self.try_decode(token, &kid).await.ok_or(AppError::Unauthorized)
    }

    async fn try_decode(&self, token: &str, kid: &str) -> Option<Claims> {
        let keys = self.0.keys.read().await;
        let key = keys.get(kid)?;
        decode::<Claims>(token, key, &self.0.validation)
            .inspect_err(|e| tracing::warn!(kid, error = ?e, "JWT validation failed"))
            .ok()
            .map(|d| d.claims)
    }
}
