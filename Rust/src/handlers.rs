use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use rdkafka::{
    producer::{FutureProducer, FutureRecord},
    util::Timeout,
};
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;

use crate::{
    config::Config,
    models::{ActivityLog, ActivityLogRequest, ApiResponse},
};

// AppState to share configuration and Kafka producer across handlers
pub struct AppState {
    pub producer: FutureProducer,
    pub config: Config,
}

/// Ingests a new activity log.

/// Accepts a JSON payload matching `ActivityLogRequest` and Asynchronously sends it to Kafka
pub async fn ingest_log(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ActivityLogRequest>,
) -> impl IntoResponse {
    // Generate a unique ID for this log
    let log_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Create the full log object
    let log = ActivityLog {
        id: log_id.clone(),
        service: payload.service,
        action: payload.action,
        userId: payload.userId,
        metadata: payload.metadata,
        severity: payload.severity,
        // Use provided timestamp or current time
        timestamp: payload.timestamp.unwrap_or_else(|| now.clone()),
        createdAt: now,
    };

    // Serialize to JSON for Kafka
    // We use serde_json::to_string which is CPU-bound but very fast in Rust.
    // In a blocking generic framework this would block the thread, but here
    // it's fast enough to be negligible, or we could use `spawn_blocking` if it was huge.
    let payload_json = match serde_json::to_string(&log) {
        Ok(json) => json,
        Err(e) => {
            tracing::error!("Failed to serialize log: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    logId: "".to_string(),
                    message: "Failed to process log".to_string(),
                }),
            );
        }
    };

    // Send to Kafka
    // We use `FutureProducer` which is designed for async contexts.
    // `send` returns a Future that resolves when the message is acknowledged by Kafka.
    // For maximum throughput, we could just "fire and forget", but waiting for
    // ACK (0ms timeout implies queueing) ensures we don't drop messages implicitly if queue is full.
    //
    // However, strictly speaking, `producer.send(...)` returns a Future. 
    // If we `await` it, we wait for Kafka ACK.
    // To match Node.js "fire and forget" or "batch" behavior for raw speed, 
    // we might want minimal waiting. 
    // But `rdkafka` handles batching internally efficiently.
    // 
    // We use a short timeout (0) to queue efficiently. 
    // If we want to guarantee it reached the broker, we set a timeout.
    let delivery_status = state.producer
        .send(
            FutureRecord::to(&state.config.kafka_topic)
                .payload(&payload_json)
                .key(&log.id), // Key helps with partitioning
            Timeout::After(std::time::Duration::from_secs(0)),
        )
        .await;

    match delivery_status {
        Ok(_) => {
            // Successfully queued/sent
            (
                StatusCode::ACCEPTED,
                Json(ApiResponse {
                    success: true,
                    logId: log_id,
                    message: "Log accepted for processing".to_string(),
                }),
            )
        }
        Err((e, _msg)) => {
            tracing::error!("Failed to produce to Kafka: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    logId: log_id,
                    message: "Failed to queue log".to_string(),
                }),
            )
        }
    }
}
