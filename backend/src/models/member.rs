use chrono::{DateTime, Utc};
use serde::Serialize;

use super::{User, WorkspaceRole};

#[derive(Debug, Serialize)]
pub struct WorkspaceMember {
    pub user: User,
    pub role: WorkspaceRole,
    pub joined_at: DateTime<Utc>,
}
