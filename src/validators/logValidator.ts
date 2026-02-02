import Joi from 'joi';
import { Severity } from '../config/types/index';

export const createLogSchema = Joi.object({
  service: Joi.string().min(1).max(100).required(),
  action: Joi.string().min(1).max(200).required(),
  userId: Joi.string().max(100).optional(),
  metadata: Joi.object().optional(),
  severity: Joi.string()
    .valid(...Object.values(Severity))
    .default(Severity.INFO),
  timestamp: Joi.date().iso().default(() => new Date()),
});

export const queryLogsSchema = Joi.object({
  service: Joi.string().min(1).max(100).optional(),
  action: Joi.string().min(1).max(200).optional(),
  userId: Joi.string().max(100).optional(),
  severity: Joi.string()
    .valid(...Object.values(Severity))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const batchCreateLogsSchema = Joi.array()
  .items(createLogSchema)
  .min(1)
  .max(100);