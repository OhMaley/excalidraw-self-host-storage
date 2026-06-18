use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<Value>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Forbidden(String),

    #[error("missing or invalid bearer token")]
    Unauthorized,

    #[error("{0}")]
    Conflict(String),

    #[error("{0}")]
    UnprocessableEntity(String),

    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error("internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                self.to_string(),
            ),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg),
            AppError::UnprocessableEntity(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "UNPROCESSABLE_ENTITY",
                msg,
            ),
            AppError::Internal(msg) => {
                tracing::error!("internal error: {msg}");
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "internal server error".to_string())
            }
            AppError::Sqlx(e) => match e {
                sqlx::Error::RowNotFound => {
                    (StatusCode::NOT_FOUND, "NOT_FOUND", "resource not found".to_string())
                }
                sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() => {
                    (StatusCode::CONFLICT, "CONFLICT", "resource already exists".to_string())
                }
                sqlx::Error::Database(ref db_err) if db_err.is_foreign_key_violation() => (
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "UNPROCESSABLE_ENTITY",
                    "referenced resource not found".to_string(),
                ),
                e => {
                    tracing::error!(error = ?e, "unhandled database error");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "INTERNAL_SERVER_ERROR",
                        "internal server error".to_string(),
                    )
                }
            },
        };

        (status, Json(ErrorBody { code, message, details: None })).into_response()
    }
}
