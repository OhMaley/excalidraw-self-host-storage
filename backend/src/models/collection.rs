use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use super::User;

#[derive(Debug, Serialize)]
pub struct Collection {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: User,
    pub created_at: DateTime<Utc>,
    pub updated_by: Option<User>,
    pub updated_at: Option<DateTime<Utc>>,
}
