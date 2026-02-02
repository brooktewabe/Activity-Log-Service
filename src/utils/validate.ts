import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from './logger.js';

export const validate = (schema: Joi.ObjectSchema | Joi.ArraySchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req.method === 'GET' ? req.query : req.body;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', { errors, path: req.path });

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors,
      });
    }

    // Replace request data with validated data
    if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
    return;
  };
};