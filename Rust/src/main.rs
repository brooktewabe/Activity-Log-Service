mod config;
mod handlers;
mod models;

use axum::{
    routing::{get, post},
    Router,
};
use rdkafka::{
    config::ClientConfig,
    producer::FutureProducer,
};
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{config::Config, handlers::AppState};

#[tokio::main]
async fn main() {
    // Initialize logging/tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();

    tracing::info!("Starting Activity Log Service (Rust)...");
    tracing::info!("Kafka Brokers: {}", config.kafka_brokers);
    tracing::info!("Kafka Topic: {}", config.kafka_topic);

    // Initialize Kafka Producer
    // `ClientConfig` is used to configure librdkafka
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &config.kafka_brokers)
        .set("message.timeout.ms", "5000") // 5s timeout
        .set("queue.buffering.max.ms", "100") // Wait up to 100ms to batch messages (batching!)
        // "queue.buffering.max.ms" is critical for high throughput. 
        // It allows the producer to wait slightly to accumulate batch.
        .create()
        .expect("Producer creation error");

    // Create AppState
    let state = Arc::new(AppState {
        producer,
        config: config.clone(),
    });

    // Build Router
    let app = Router::new()
        .route("/api/v1/logs", post(handlers::ingest_log))
        // Health check
        .route("/health", get(|| async { "OK" }))
        .with_state(state);

    // Run Server
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    
    tracing::info!("Server listening on {}", addr);
    
    axum::serve(listener, app).await.unwrap();
}
