import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const logsIngestedTotal = new client.Counter({
  name: 'logs_ingested_total',
  help: 'Total number of logs ingested',
  labelNames: ['service', 'severity'],
  registers: [register],
});

export const kafkaMessagesProducedTotal = new client.Counter({
  name: 'kafka_messages_produced_total',
  help: 'Total number of messages produced to Kafka',
  registers: [register],
});

export const kafkaMessagesConsumedTotal = new client.Counter({
  name: 'kafka_messages_consumed_total',
  help: 'Total number of messages consumed from Kafka',
  registers: [register],
});

export const logsQueryDuration = new client.Histogram({
  name: 'logs_query_duration_seconds',
  help: 'Duration of log queries in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Middleware to track metrics
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    activeConnections.dec();
  });

  next();
};

// Endpoint to expose metrics
export const metricsEndpoint = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};