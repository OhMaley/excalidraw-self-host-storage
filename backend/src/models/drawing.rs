use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use super::User;

#[derive(Debug, Serialize)]
pub struct Drawing {
    pub id: Uuid,
    pub collection_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_by: User,
    pub created_at: DateTime<Utc>,
    pub updated_by: Option<User>,
    pub updated_at: Option<DateTime<Utc>>,
}
