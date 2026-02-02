# 🦀 Activity Log Service (Rust Implementation)

A high-performance microservice for ingesting activity logs, built with **Rust**, **Axum**, and **Apache Kafka**.

> **Performance Note**: This service is designed to handle **10k+ requests/second** with sub-millisecond processing latency, serving as a high-throughput alternative to the Node.js ingestion layer.

## 🚀 Key Features

- **High Throughput**: Built on [Axum](https://github.com/tokio-rs/axum) and [Tokio](https://tokio.rs/) for asynchronous, non-blocking I/O.
- **Low Latency**: Uses [rdkafka](https://github.com/fede1024/rust-rdkafka) (binding to C librdkafka) for extremely fast message production.
- **Efficient JSON Parsing**: Leveraging [Serde](https://serde.rs/) for zero-copy deserialization where possible.
- **Robustness**: Strong typing and compile-time guarantees provided by Rust.

## 🛠️ Architecture

This service acts as an **Ingestion Gateway**:
1.  Receives HTTP `POST` requests with JSON payloads.
2.  Validates and enriches data (adds UUIDs, timestamps).
3.  Asynchronously pushes messages to a Kafka topic.
4.  Immediately acknowledges the client (HTTP 202 Accepted).

## ⚙️ Prerequisites

- **Rust**: Latest stable version ([Install Rust](https://rustup.rs/)).
- **Kafka**: A running Kafka broker (e.g., via Docker).
- **Build Tools**:
    - **Windows**: Visual Studio C++ Build Tools.
    - **Linux/Mac**: `build-essential` or `Xcode` command line tools.

## 📦 Installation & Setup

1.  **Navigate to the Rust directory**:
    ```bash
    cd Rust
    ```

2.  **Environment Configuration**:
    The project uses a `.env` file for configuration. A default file is provided:
    ```ini
    PORT=3001
    KAFKA_BROKERS=localhost:9092
    KAFKA_TOPIC=activity-logs
    RUST_LOG=info
    ```

3.  **Build the Project**:
    ```bash
    cargo build --release
    ```
    *Note: The first build may take a few minutes to compile dependencies.*

## 🏃‍♂️ Usage

### Running the Service
For maximum performance, always run in **release mode**:

```bash
cargo run --release
```
You should see:
```text
INFO: Server listening on 0.0.0.0:3001
INFO: Kafka producer connected
```

### API Endpoints

#### `POST /api/v1/logs`
Ingest a new activity log.

**Request Body:**
```json
{
  "service": "payment-service",
  "action": "process_payment",
  "userId": "user_123",
  "severity": "info",
  "metadata": { "amount": 100 }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "logId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Log accepted for processing"
}
```

## 📊 Benchmarking

We have provided a script to compare this Rust implementation against the Node.js version.

1.  **Start the Rust Service**:
    ```bash
    cd Rust && cargo run --release
    ```
2.  **Run the Load Test** (from the root `Node` folder):
    ```bash
    node scripts/load-test-rust.js
    ```

### Expected Results
| Metric | Node.js | Rust |
|--------|---------|------|
| **Throughput** | ~1,500 req/sec | **>10,000 req/sec** |
| **Latency (p99)** | ~1,200ms | **<50ms** |
| **Failures** | High under load | **Near Zero** |

## 🧩 Project Structure

- `src/main.rs`: Application entry point and server setup.
- `src/handlers.rs`: API route handlers and core logic.
- `src/models.rs`: Struct definitions for requests/responses.
- `src/config.rs`: Environment variable management.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.
