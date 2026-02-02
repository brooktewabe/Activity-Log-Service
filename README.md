# Activity Log Service

A microservice for tracking and querying activity logs across the platform.

This project is primarily built with **Node.js (Express & TypeScript)** for ease of development and ecosystem integration.

🚀 **High-Performance Option**: For environments with extreme ingestion requirements (>10k req/sec), we include an optional **Rust** ingestion module. This module seamlessly replaces the Node.js ingestion layer to deliver 10x throughput and sub-millisecond latency.

## 📂 Project Structure

- **`/Node`**: Core Service (API, Querying, Management).
    - Built with Express.js, TypeScript, Mongoose.
    - Handles Log Ingestion (Default), Querying, Stats, and Management.
- **`/Rust`** *(Optional)*: High-Performance Ingestion Layer.
    - Built with Axum, Tokio, Rdkafka.
    - specialized **only** for the optimized `POST /logs` endpoint.

## ⚡ Performance: When to use Rust?

The default Node.js implementation is sufficient for most loads (~1,500 req/sec). However, if your traffic spikes or you need lower latency, the Rust module provides a massive boost.

| Metric | 🐢 Node.js (Default) | 🦀 Rust (Optional Module) | Improvement |
|:-------|:---------------------|:--------------------------|:------------|
| **Throughput** | ~1,500 req/sec | **>10,000 req/sec** | **~6.5x** 🚀 |
| **Avg Latency** | ~1.2 seconds | **<20 ms** | **~60x** ⚡ |
| **P99 Latency** | ~7.2 seconds | **<50 ms** | **~140x** ⚡ |
| **CPU Efficiency** | Low (Single Core) | High (Multi-Core) | **Excellent** |

## 🚀 Getting Started

### Prerequisites
- Docker (for Kafka & MongoDB)
- Node.js (v18+)

### 1. Start Infrastructure
Start the shared services (Kafka, ZooKeeper, MongoDB, Redis):
```bash
docker-compose up -d
```

### 2. Run the Main Service (Node.js)
```bash
cd Node
npm install
npm run dev
# Server running on port 3000
```
*By default, this handles everything including ingestion.*

### 3. (Optional) Enable High-Performance Ingestion
If you need the performance boost, run the Rust service alongside or instead of the Node.js ingestion endpoint.

```bash
cd Rust
cargo run --release
# Server running on port 3001
```
*You can then route ingestion traffic (`POST /api/v1/logs`) to port 3001 while keeping other traffic on port 3000.*

## 🧪 Benchmarking

To verify the performance difference yourself:

**Test Node.js:**
```bash
cd Node
npm run test:load:ingest
```

**Test Rust:**
```bash
cd Node
node scripts/load-test-rust.js
```
