/**
 * Standard API contracts and pagination interfaces for PreScan
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: ApiMetadata;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  requestId?: string;
}

export interface ApiMetadata {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
