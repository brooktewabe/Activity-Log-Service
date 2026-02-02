use serde::{Deserialize, Serialize};
use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub kafka_brokers: String,
    pub kafka_topic: String,
    pub kafka_client_id: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .expect("PORT must be a number"),
            kafka_brokers: env::var("KAFKA_BROKERS")
                .unwrap_or_else(|_| "localhost:9092".to_string()),
            kafka_topic: env::var("KAFKA_TOPIC")
                .unwrap_or_else(|_| "activity-logs".to_string()),
            kafka_client_id: env::var("KAFKA_CLIENT_ID")
                .unwrap_or_else(|_| "activity-log-rust".to_string()),
        }
    }
}
