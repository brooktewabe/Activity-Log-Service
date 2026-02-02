import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { connectMongoDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initKafkaProducer } from './config/kafka.js';
import router from './routes/index.js';
import { errorHandler } from './utils/errorHandler.js';
import { metricsMiddleware, metricsEndpoint } from './utils/metrics.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics middleware
app.use(metricsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'activity-log-node',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// API routes
app.use('/api/v1', router);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path
  });
});

async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    logger.info('MongoDB connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Initialize Kafka producer
    await initKafkaProducer();
    logger.info('Kafka producer initialized');

    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 Node.js Activity Log Service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();