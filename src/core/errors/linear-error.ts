/**
 * Error codes for Linear MCP operations
 */
export enum LinearErrorCode {
  // Authentication errors (1xxx)
  AUTH_NOT_INITIALIZED = 'AUTH_NOT_INITIALIZED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_FAILED = 'AUTH_REFRESH_FAILED',

  // Validation errors (2xxx)
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_TYPE = 'VALIDATION_INVALID_TYPE',
  VALIDATION_INVALID_VALUE = 'VALIDATION_INVALID_VALUE',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Resource errors (3xxx)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Rate limit errors (4xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_QUOTA_EXHAUSTED = 'RATE_LIMIT_QUOTA_EXHAUSTED',

  // Network errors (5xxx)
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_DNS_FAILED = 'NETWORK_DNS_FAILED',

  // GraphQL errors (6xxx)
  GRAPHQL_QUERY_FAILED = 'GRAPHQL_QUERY_FAILED',
  GRAPHQL_MUTATION_FAILED = 'GRAPHQL_MUTATION_FAILED',
  GRAPHQL_VALIDATION_FAILED = 'GRAPHQL_VALIDATION_FAILED',

  // Internal errors (9xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error context for additional debugging information
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Structured error log format
 */
export interface ErrorLog {
  timestamp: string;
  level: 'ERROR' | 'WARN';
  type: string;
  code: LinearErrorCode;
  message: string;
  context?: ErrorContext;
  stack?: string;
  cause?: Error;
}

/**
 * Base error class for all Linear MCP errors.
 *
 * Provides:
 * - Error code for programmatic handling
 * - Context object for debugging details
 * - Timestamp for logging
 * - Cause chaining for nested errors
 * - Structured JSON logging
 *
 * Usage:
 * ```typescript
 * throw new LinearError(
 *   'Invalid priority value',
 *   LinearErrorCode.VALIDATION_INVALID_VALUE,
 *   { field: 'priority', value: 99, valid: [0,1,2,3,4] }
 * );
 * ```
 */
export class LinearError extends Error {
  public readonly code: LinearErrorCode;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: LinearErrorCode,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);
    this.name = 'LinearError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.cause = cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured log format
   */
  public toLog(): ErrorLog {
    return {
      timestamp: this.timestamp.toISOString(),
      level: 'ERROR',
      type: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      cause: this.cause
    };
  }

  /**
   * Convert error to JSON string for logging
   */
  public toJSON(): string {
    return JSON.stringify(this.toLog(), null, 2);
  }

  /**
   * Get user-friendly error message with context
   */
  public getUserMessage(): string {
    let msg = `${this.message}`;

    if (this.context) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      msg += ` (${contextStr})`;
    }

    if (this.cause) {
      msg += ` | Caused by: ${this.cause.message}`;
    }

    return msg;
  }
}
