import { Request, Response } from 'express';
import { logService } from '../services/logService.js';
import { asyncHandler, AppError } from '../utils/errorHandler';
import { ActivityLog, LogQueryParams } from '../config/types/index';

export const createLog = asyncHandler(async (req: Request, res: Response) => {
  const logData: ActivityLog = req.body;

  const logId = await logService.createLog(logData);

  res.status(202).json({
    success: true,
    logId,
    message: 'Log accepted for processing',
  });
});

export const createBatchLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const logs: ActivityLog[] = req.body;

    const logIds = await logService.createBatchLogs(logs);

    res.status(202).json({
      success: true,
      logIds,
      count: logIds.length,
      message: 'Logs accepted for processing',
    });
  }
);

export const queryLogs = asyncHandler(async (req: Request, res: Response) => {
  const params: LogQueryParams = req.query as any;

  const result = await logService.queryLogs(params);

  res.json(result);
});

export const getLogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const log = await logService.getLogById(id);

  if (!log) {
    throw new AppError(404, 'Log not found');
  }

  res.json({
    success: true,
    data: log,
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const { service, startDate, endDate } = req.query;

  const stats = await logService.getStats(
    service as string,
    startDate as string,
    endDate as string
  );

  res.json({
    success: true,
    data: stats,
  });
});