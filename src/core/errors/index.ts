/**
 * Domain-specific error types for Linear MCP server.
 *
 * This module provides a hierarchy of error types that:
 * - Enable programmatic error handling (catch specific types)
 * - Include structured context for debugging
 * - Support error chaining (cause)
 * - Provide structured logging
 *
 * Usage:
 * ```typescript
 * import { ValidationError, IssueNotFoundError } from './core/errors';
 *
 * // Throw with context
 * throw new ValidationError(
 *   'Invalid priority value',
 *   'priority',
 *   99,
 *   [0, 1, 2, 3, 4]
 * );
 *
 * // Catch specific error types
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(`Validation failed for field: ${error.field}`);
 *   } else if (error instanceof IssueNotFoundError) {
 *     console.log(`Issue ${error.resourceId} not found`);
 *   }
 * }
 * ```
 */

export {
  LinearError,
  LinearErrorCode,
  ErrorContext,
  ErrorLog
} from './linear-error.js';

export {
  AuthenticationError,
  ValidationError,
  ResourceNotFoundError,
  RateLimitError,
  NetworkError,
  GraphQLError,
  IssueNotFoundError,
  ProjectNotFoundError,
  TeamNotFoundError,
  MilestoneNotFoundError
} from './types.js';

import { LinearError, LinearErrorCode, ErrorContext } from './linear-error.js';
import {
  NetworkError,
  RateLimitError,
  GraphQLError
} from './types.js';

/**
 * Error logger utility for structured logging
 */
export class ErrorLogger {
  /**
   * Log error as structured JSON
   */
  static logError(error: Error): void {
    if (error instanceof LinearError) {
      console.error(error.toJSON());
    } else {
      // Generic Error - convert to structured format
      const log = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        type: error.name || 'Error',
        message: error.message,
        stack: error.stack
      };
      console.error(JSON.stringify(log, null, 2));
    }
  }

  /**
   * Log warning with structured format
   */
  static logWarning(message: string, context?: ErrorContext): void {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context
    };
    console.warn(JSON.stringify(log, null, 2));
  }
}

/**
 * Utility to check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof GraphQLError) {
    // Some GraphQL errors are retryable (timeouts, server errors)
    return error.code === LinearErrorCode.GRAPHQL_QUERY_FAILED;
  }

  // Check error message for common retryable patterns
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('500')
  );
}

/**
 * Utility to extract error code from HTTP status
 */
export function getErrorCodeFromStatus(status: number): LinearErrorCode {
  if (status === 401 || status === 403) {
    return LinearErrorCode.AUTH_INVALID_CREDENTIALS;
  }
  if (status === 404) {
    return LinearErrorCode.RESOURCE_NOT_FOUND;
  }
  if (status === 429) {
    return LinearErrorCode.RATE_LIMIT_EXCEEDED;
  }
  if (status === 408 || status === 504) {
    return LinearErrorCode.NETWORK_TIMEOUT;
  }
  if (status >= 400 && status < 500) {
    return LinearErrorCode.VALIDATION_INVALID_VALUE;
  }
  if (status >= 500 && status < 600) {
    return LinearErrorCode.GRAPHQL_QUERY_FAILED;
  }
  return LinearErrorCode.UNKNOWN_ERROR;
}
