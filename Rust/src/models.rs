use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLogRequest {
    pub service: String,
    pub action: String,
    pub userId: Option<String>, // matches Node.js userId
    pub metadata: Option<serde_json::Value>,
    pub severity: String,
    // timestamp is optional in request, we can set it if missing
    pub timestamp: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLog {
    #[serde(rename = "_id")]
    pub id: String,
    pub service: String,
    pub action: String,
    pub userId: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub severity: String,
    pub timestamp: String,
    pub createdAt: String,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub success: bool,
    pub logId: String,
    pub message: String,
}
