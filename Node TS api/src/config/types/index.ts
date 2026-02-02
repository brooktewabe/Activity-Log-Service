export enum Severity {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface ActivityLog {
  _id?: string;
  service: string;
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
  severity: Severity;
  timestamp: Date;
  createdAt?: Date;
}

export interface LogQueryParams {
  service?: string;
  action?: string;
  userId?: string;
  severity?: Severity;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StatsAggregation {
  service: string;
  action?: string;
  count: number;
  severity?: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}