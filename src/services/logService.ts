import { v4 as uuidv4 } from 'uuid';
import { getLogsCollection } from '../config/database.js';
import { produceMessage } from '../config/kafka.js';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis.js';
import {
  ActivityLog,
  LogQueryParams,
  PaginatedResponse,
  StatsAggregation,
} from '../config/types/index';
import { logger } from '../utils/logger.js';
import {
  logsIngestedTotal,
  kafkaMessagesProducedTotal,
  logsQueryDuration,
} from '../utils/metrics';

export class LogService {
  async createLog(logData: ActivityLog): Promise<string> {
    try {
      const log: ActivityLog = {
        ...logData,
        _id: uuidv4(),
        createdAt: new Date(),
      };

      // Produce to Kafka for async processing
      await produceMessage(log);
      kafkaMessagesProducedTotal.inc();

      // Increment metrics
      logsIngestedTotal.inc({
        service: log.service,
        severity: log.severity,
      });

      logger.info('Log ingested:', {
        logId: log._id,
        service: log.service,
        action: log.action,
      });

      return log._id!;
    } catch (error) {
      logger.error('Error creating log:', error);
      throw error;
    }
  }

  async createBatchLogs(logs: ActivityLog[]): Promise<string[]> {
    try {
      const logIds: string[] = [];

      for (const logData of logs) {
        const log: ActivityLog = {
          ...logData,
          _id: uuidv4(),
          createdAt: new Date(),
        };

        await produceMessage(log);
        kafkaMessagesProducedTotal.inc();
        logsIngestedTotal.inc({
          service: log.service,
          severity: log.severity,
        });

        logIds.push(log._id!);
      }

      logger.info(`Batch of ${logs.length} logs ingested`);
      return logIds;
    } catch (error) {
      logger.error('Error creating batch logs:', error);
      throw error;
    }
  }

  async queryLogs(
    params: LogQueryParams
  ): Promise<PaginatedResponse<ActivityLog>> {
    const end = logsQueryDuration.startTimer();

    try {
      const {
        service,
        action,
        userId,
        severity,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = params;

      // Build cache key
      const cacheKey = `logs:${JSON.stringify(params)}`;
      const cached = await cacheGet<PaginatedResponse<ActivityLog>>(cacheKey);

      if (cached) {
        logger.debug('Returning cached results');
        end();
        return cached;
      }

      // Build query
      const query: any = {};

      if (service) query.service = service;
      if (action) query.action = action;
      if (userId) query.userId = userId;
      if (severity) query.severity = severity;

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const collection = getLogsCollection();
      const skip = (page - 1) * limit;

      // Execute query
      const [data, total] = await Promise.all([
        collection
          .find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);

      const result: PaginatedResponse<ActivityLog> = {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };

      // Cache for 5 minutes
      await cacheSet(cacheKey, result, 300);

      end();
      return result;
    } catch (error) {
      end();
      logger.error('Error querying logs:', error);
      throw error;
    }
  }

  async getLogById(id: string): Promise<ActivityLog | null> {
    try {
      const cacheKey = `log:${id}`;
      const cached = await cacheGet<ActivityLog>(cacheKey);

      if (cached) {
        return cached;
      }

      const collection = getLogsCollection();
      const log = await collection.findOne({ _id: id });

      if (log) {
        await cacheSet(cacheKey, log, 600);
      }

      return log;
    } catch (error) {
      logger.error('Error getting log by ID:', error);
      throw error;
    }
  }

  async getStats(
    service?: string,
    startDate?: string,
    endDate?: string
  ): Promise<StatsAggregation[]> {
    try {
      const cacheKey = `stats:${service}:${startDate}:${endDate}`;
      const cached = await cacheGet<StatsAggregation[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const collection = getLogsCollection();
      const match: any = {};

      if (service) match.service = service;

      if (startDate || endDate) {
        match.timestamp = {};
        if (startDate) match.timestamp.$gte = new Date(startDate);
        if (endDate) match.timestamp.$lte = new Date(endDate);
      }

      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: {
              service: '$service',
              action: '$action',
            },
            count: { $sum: 1 },
            severities: { $push: '$severity' },
          },
        },
        {
          $project: {
            service: '$_id.service',
            action: '$_id.action',
            count: 1,
            severity: {
              $arrayToObject: {
                $map: {
                  input: ['info', 'warn', 'error', 'critical'],
                  as: 'sev',
                  in: {
                    k: '$$sev',
                    v: {
                      $size: {
                        $filter: {
                          input: '$severities',
                          cond: { $eq: ['$$this', '$$sev'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ];

      const stats = await collection.aggregate(pipeline).toArray();

      const result: StatsAggregation[] = stats.map((stat: any) => ({
        service: stat.service,
        action: stat.action,
        count: stat.count,
        severity: stat.severity,
        timeRange: {
          start: startDate ? new Date(startDate) : new Date(0),
          end: endDate ? new Date(endDate) : new Date(),
        },
      }));

      await cacheSet(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }

  async invalidateCache(id?: string): Promise<void> {
    if (id) {
      await cacheDelete(`log:${id}`);
    }
    // In production, you'd want more sophisticated cache invalidation
  }
}

export const logService = new LogService();