import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimiting.maxRequestsPerMinute,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const ingestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimiting.maxRequestsPerMinute * 2, // Higher limit for ingestion
  message: {
    success: false,
    error: 'Ingestion rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});