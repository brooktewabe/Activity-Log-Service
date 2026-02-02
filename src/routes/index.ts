import { Router } from 'express';
import {
  createLog,
  createBatchLogs,
  queryLogs,
  getLogById,
  getStats,
} from '../controllers/logController';
import { validate } from '../utils/validate';
import {
  createLogSchema,
  batchCreateLogsSchema,
  queryLogsSchema,
} from '../validators/logValidator';
import { ingestLimiter, apiLimiter } from '../utils/rateLimiter';

const router = Router();

// Ingestion endpoints
router.post('/logs', ingestLimiter, validate(createLogSchema), createLog);

router.post(
  '/logs/batch',
  ingestLimiter,
  validate(batchCreateLogsSchema),
  createBatchLogs
);

// Query endpoints
router.get('/logs', apiLimiter, validate(queryLogsSchema), queryLogs);

router.get('/logs/:id', apiLimiter, getLogById);

router.get('/stats', apiLimiter, getStats);

export default router;