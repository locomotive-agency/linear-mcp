import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  LinearError,
  LinearErrorCode,
  AuthenticationError,
  ValidationError,
  ResourceNotFoundError,
  RateLimitError,
  NetworkError,
  GraphQLError,
  IssueNotFoundError,
  ProjectNotFoundError,
  TeamNotFoundError,
  MilestoneNotFoundError,
  ErrorLogger,
  isRetryableError,
  getErrorCodeFromStatus
} from '../core/errors';

describe('Domain-Specific Errors', () => {
  describe('LinearError (Base)', () => {
    it('should create error with all properties', () => {
      const error = new LinearError(
        'Test error',
        LinearErrorCode.INTERNAL_ERROR,
        { key: 'value' },
        new Error('Original error')
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(LinearErrorCode.INTERNAL_ERROR);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('LinearError');
    });

    it('should work without optional parameters', () => {
      const error = new LinearError('Simple error', LinearErrorCode.UNKNOWN_ERROR);

      expect(error.message).toBe('Simple error');
      expect(error.code).toBe(LinearErrorCode.UNKNOWN_ERROR);
      expect(error.context).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should convert to structured log format', () => {
      const error = new LinearError(
        'Test error',
        LinearErrorCode.VALIDATION_INVALID_VALUE,
        { field: 'priority', value: 99 }
      );

      const log = error.toLog();

      expect(log.timestamp).toBeTruthy();
      expect(log.level).toBe('ERROR');
      expect(log.type).toBe('LinearError');
      expect(log.code).toBe(LinearErrorCode.VALIDATION_INVALID_VALUE);
      expect(log.message).toBe('Test error');
      expect(log.context).toEqual({ field: 'priority', value: 99 });
      expect(log.stack).toBeTruthy();
    });

    it('should convert to JSON string', () => {
      const error = new LinearError('Test error', LinearErrorCode.INTERNAL_ERROR);
      const json = error.toJSON();

      expect(json).toBeTruthy();
      expect(json).toContain('"level": "ERROR"');
      expect(json).toContain('"message": "Test error"');
      expect(json).toContain(LinearErrorCode.INTERNAL_ERROR);
    });

    it('should generate user-friendly message', () => {
      const error = new LinearError(
        'Invalid input',
        LinearErrorCode.VALIDATION_INVALID_VALUE,
        { field: 'priority', value: 99, valid: [0, 1, 2, 3, 4] }
      );

      const userMsg = error.getUserMessage();

      expect(userMsg).toContain('Invalid input');
      expect(userMsg).toContain('field');
      expect(userMsg).toContain('priority');
      expect(userMsg).toContain('99');
    });

    it('should include cause in user message', () => {
      const cause = new Error('Network timeout');
      const error = new LinearError(
        'Operation failed',
        LinearErrorCode.NETWORK_TIMEOUT,
        undefined,
        cause
      );

      const userMsg = error.getUserMessage();

      expect(userMsg).toContain('Operation failed');
      expect(userMsg).toContain('Caused by: Network timeout');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid API key');

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid API key');
      expect(error.code).toBe(LinearErrorCode.AUTH_INVALID_CREDENTIALS);
    });

    it('should support custom error codes', () => {
      const error = new AuthenticationError(
        'Token expired',
        { code: LinearErrorCode.AUTH_TOKEN_EXPIRED }
      );

      expect(error.code).toBe(LinearErrorCode.AUTH_TOKEN_EXPIRED);
    });

    it('should be catchable as AuthenticationError', () => {
      const error = new AuthenticationError('Auth failed');

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(AuthenticationError);
        expect(e).toBeInstanceOf(LinearError);
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field details', () => {
      const error = new ValidationError(
        'Invalid priority',
        'priority',
        99,
        [0, 1, 2, 3, 4]
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid priority');
      expect(error.field).toBe('priority');
      expect(error.value).toBe(99);
      expect(error.validValues).toEqual([0, 1, 2, 3, 4]);
      expect(error.code).toBe(LinearErrorCode.VALIDATION_INVALID_VALUE);
    });

    it('should work with minimal parameters', () => {
      const error = new ValidationError('Required field missing');

      expect(error.message).toBe('Required field missing');
      expect(error.field).toBeUndefined();
    });

    it('should be catchable as ValidationError', () => {
      const error = new ValidationError('Validation failed', 'email', 'invalid');

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        if (e instanceof ValidationError) {
          expect(e.field).toBe('email');
          expect(e.value).toBe('invalid');
        }
      }
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create resource not found error', () => {
      const error = new ResourceNotFoundError('Issue', 'LOC-999');

      expect(error.name).toBe('ResourceNotFoundError');
      expect(error.message).toBe('Issue not found: LOC-999');
      expect(error.resourceType).toBe('Issue');
      expect(error.resourceId).toBe('LOC-999');
      expect(error.code).toBe(LinearErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should support cause chaining', () => {
      const cause = new Error('API returned 404');
      const error = new ResourceNotFoundError('Project', 'proj-123', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('Specific Resource Errors', () => {
    it('should create IssueNotFoundError', () => {
      const error = new IssueNotFoundError('LOC-123');

      expect(error.name).toBe('IssueNotFoundError');
      expect(error.message).toBe('Issue not found: LOC-123');
      expect(error.resourceType).toBe('Issue');
      expect(error.resourceId).toBe('LOC-123');
    });

    it('should create ProjectNotFoundError', () => {
      const error = new ProjectNotFoundError('proj-456');

      expect(error.name).toBe('ProjectNotFoundError');
      expect(error.resourceType).toBe('Project');
      expect(error.resourceId).toBe('proj-456');
    });

    it('should create TeamNotFoundError', () => {
      const error = new TeamNotFoundError('team-789');

      expect(error.name).toBe('TeamNotFoundError');
      expect(error.resourceType).toBe('Team');
      expect(error.resourceId).toBe('team-789');
    });

    it('should create MilestoneNotFoundError', () => {
      const error = new MilestoneNotFoundError('milestone-abc');

      expect(error.name).toBe('MilestoneNotFoundError');
      expect(error.resourceType).toBe('Milestone');
      expect(error.resourceId).toBe('milestone-abc');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry info', () => {
      const error = new RateLimitError(
        'Rate limit exceeded',
        60,  // retryAfter
        0,   // remaining
        Date.now() + 3600000  // resetTime
      );

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBe(60);
      expect(error.remaining).toBe(0);
      expect(error.resetTime).toBeTruthy();
      expect(error.code).toBe(LinearErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('should work without optional parameters', () => {
      const error = new RateLimitError('Quota exhausted');

      expect(error.message).toBe('Quota exhausted');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('NetworkError', () => {
    it('should create network error with URL and status', () => {
      const error = new NetworkError(
        'Connection failed',
        LinearErrorCode.NETWORK_CONNECTION_FAILED,
        'https://api.linear.app/graphql',
        503
      );

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.url).toBe('https://api.linear.app/graphql');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe(LinearErrorCode.NETWORK_CONNECTION_FAILED);
    });

    it('should use default code if not provided', () => {
      const error = new NetworkError('Timeout');

      expect(error.code).toBe(LinearErrorCode.NETWORK_CONNECTION_FAILED);
    });

    it('should support different network error codes', () => {
      const timeoutError = new NetworkError(
        'Request timeout',
        LinearErrorCode.NETWORK_TIMEOUT
      );
      const dnsError = new NetworkError(
        'DNS failed',
        LinearErrorCode.NETWORK_DNS_FAILED
      );

      expect(timeoutError.code).toBe(LinearErrorCode.NETWORK_TIMEOUT);
      expect(dnsError.code).toBe(LinearErrorCode.NETWORK_DNS_FAILED);
    });
  });

  describe('GraphQLError', () => {
    it('should create GraphQL error with query details', () => {
      const query = 'query GetIssues { issues { nodes { id } } }';
      const variables = { first: 10 };
      const graphQLErrors = [{ message: 'Invalid field' }];

      const error = new GraphQLError(
        'GraphQL operation failed',
        query,
        variables,
        graphQLErrors
      );

      expect(error.name).toBe('GraphQLError');
      expect(error.message).toBe('GraphQL operation failed');
      expect(error.query).toBe(query);
      expect(error.variables).toEqual(variables);
      expect(error.graphQLErrors).toEqual(graphQLErrors);
      expect(error.code).toBe(LinearErrorCode.GRAPHQL_QUERY_FAILED);
    });

    it('should truncate long queries in context', () => {
      const longQuery = 'a'.repeat(300);
      const error = new GraphQLError('Failed', longQuery);

      // Context should have truncated query
      expect(error.context?.query).toBeTruthy();
      expect((error.context?.query as string).length).toBeLessThanOrEqual(200);
    });
  });

  describe('ErrorLogger', () => {
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
    let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should log LinearError as structured JSON', () => {
      const error = new ValidationError('Invalid input', 'field', 'value');

      ErrorLogger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedData = consoleErrorSpy.mock.calls[0][0];
      expect(loggedData).toContain('"level": "ERROR"');
      expect(loggedData).toContain('"type": "ValidationError"');
      expect(loggedData).toContain('Invalid input');
    });

    it('should log generic Error as structured JSON', () => {
      const error = new Error('Generic error');

      ErrorLogger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedData = consoleErrorSpy.mock.calls[0][0];
      expect(loggedData).toContain('"level": "ERROR"');
      expect(loggedData).toContain('Generic error');
    });

    it('should log warnings with context', () => {
      ErrorLogger.logWarning('Low quota', { remaining: 50 });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const loggedData = consoleWarnSpy.mock.calls[0][0];
      expect(loggedData).toContain('"level": "WARN"');
      expect(loggedData).toContain('Low quota');
      expect(loggedData).toContain('"remaining": 50');
    });
  });

  describe('isRetryableError', () => {
    it('should identify NetworkError as retryable', () => {
      const error = new NetworkError('Timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify RateLimitError as retryable', () => {
      const error = new RateLimitError('Rate limited');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify 5xx errors as retryable', () => {
      const error = new Error('500 Internal Server Error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should NOT identify ValidationError as retryable', () => {
      const error = new ValidationError('Invalid field');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should NOT identify AuthenticationError as retryable', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should NOT identify 4xx errors as retryable', () => {
      const error = new Error('404 Not Found');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getErrorCodeFromStatus', () => {
    it('should map 401 to AUTH_INVALID_CREDENTIALS', () => {
      expect(getErrorCodeFromStatus(401)).toBe(
        LinearErrorCode.AUTH_INVALID_CREDENTIALS
      );
    });

    it('should map 403 to AUTH_INVALID_CREDENTIALS', () => {
      expect(getErrorCodeFromStatus(403)).toBe(
        LinearErrorCode.AUTH_INVALID_CREDENTIALS
      );
    });

    it('should map 404 to RESOURCE_NOT_FOUND', () => {
      expect(getErrorCodeFromStatus(404)).toBe(
        LinearErrorCode.RESOURCE_NOT_FOUND
      );
    });

    it('should map 429 to RATE_LIMIT_EXCEEDED', () => {
      expect(getErrorCodeFromStatus(429)).toBe(
        LinearErrorCode.RATE_LIMIT_EXCEEDED
      );
    });

    it('should map 408 to NETWORK_TIMEOUT', () => {
      expect(getErrorCodeFromStatus(408)).toBe(
        LinearErrorCode.NETWORK_TIMEOUT
      );
    });

    it('should map 504 to NETWORK_TIMEOUT', () => {
      expect(getErrorCodeFromStatus(504)).toBe(
        LinearErrorCode.NETWORK_TIMEOUT
      );
    });

    it('should map 4xx to VALIDATION_INVALID_VALUE', () => {
      expect(getErrorCodeFromStatus(400)).toBe(
        LinearErrorCode.VALIDATION_INVALID_VALUE
      );
      expect(getErrorCodeFromStatus(422)).toBe(
        LinearErrorCode.VALIDATION_INVALID_VALUE
      );
    });

    it('should map 5xx to GRAPHQL_QUERY_FAILED', () => {
      expect(getErrorCodeFromStatus(500)).toBe(
        LinearErrorCode.GRAPHQL_QUERY_FAILED
      );
      expect(getErrorCodeFromStatus(503)).toBe(
        LinearErrorCode.GRAPHQL_QUERY_FAILED
      );
    });

    it('should map unknown statuses to UNKNOWN_ERROR', () => {
      expect(getErrorCodeFromStatus(999)).toBe(
        LinearErrorCode.UNKNOWN_ERROR
      );
    });
  });

  describe('Error Type Hierarchy', () => {
    it('should support catching by base type', () => {
      const errors = [
        new ValidationError('Validation failed'),
        new IssueNotFoundError('LOC-123'),
        new RateLimitError('Rate limited'),
        new NetworkError('Network failed'),
      ];

      errors.forEach(error => {
        try {
          throw error;
        } catch (e) {
          expect(e).toBeInstanceOf(LinearError);
          expect(e).toBeInstanceOf(Error);
        }
      });
    });

    it('should support catching by specific type', () => {
      const errors = [
        { error: new ValidationError('Test'), type: ValidationError },
        { error: new IssueNotFoundError('LOC-1'), type: IssueNotFoundError },
        { error: new RateLimitError('Test'), type: RateLimitError },
        { error: new NetworkError('Test'), type: NetworkError },
      ];

      errors.forEach(({ error, type }) => {
        try {
          throw error;
        } catch (e) {
          expect(e).toBeInstanceOf(type);
        }
      });
    });

    it('should support error type discrimination', () => {
      const error: LinearError = new ValidationError('Test', 'testField', 'testValue');

      if (error instanceof ValidationError) {
        expect(error.field).toBe('testField');
        expect(error.value).toBe('testValue');
      } else if (error instanceof RateLimitError) {
        // This branch shouldn't execute
        fail('Should be ValidationError, not RateLimitError');
      }
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle invalid priority validation', () => {
      const error = new ValidationError(
        'Priority must be between 0 and 4',
        'priority',
        99,
        [0, 1, 2, 3, 4]
      );

      const log = error.toLog();
      expect(log.context?.field).toBe('priority');
      expect(log.context?.value).toBe(99);
      expect(log.context?.validValues).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle issue not found scenario', () => {
      const error = new IssueNotFoundError('LOC-999');

      expect(error.getUserMessage()).toContain('Issue not found: LOC-999');
      expect(error.resourceType).toBe('Issue');
    });

    it('should handle rate limit with retry info', () => {
      const resetTime = Date.now() + 3600000;
      const error = new RateLimitError(
        'API rate limit exceeded',
        60,
        0,
        resetTime
      );

      const log = error.toLog();
      expect(log.context?.retryAfter).toBe(60);
      expect(log.context?.remaining).toBe(0);
      expect(log.context?.resetTime).toBe(resetTime);
    });

    it('should handle network timeout with URL', () => {
      const error = new NetworkError(
        'Request timeout',
        LinearErrorCode.NETWORK_TIMEOUT,
        'https://api.linear.app/graphql',
        408
      );

      const log = error.toLog();
      expect(log.context?.url).toContain('linear.app');
      expect(log.context?.statusCode).toBe(408);
    });

    it('should handle GraphQL validation errors', () => {
      const graphQLErrors = [
        { message: 'Unknown field "foo"', path: ['issues', 'foo'] }
      ];

      const error = new GraphQLError(
        'GraphQL validation failed',
        'query { issues { foo } }',
        undefined,
        graphQLErrors
      );

      const log = error.toLog();
      expect(log.context?.graphQLErrors).toEqual(graphQLErrors);
    });

    it('should chain multiple errors', () => {
      const networkError = new NetworkError('Connection failed');
      const graphqlError = new GraphQLError(
        'Query failed',
        'query { }',
        undefined,
        undefined,
        networkError
      );

      expect(graphqlError.cause).toBe(networkError);
      expect(graphqlError.getUserMessage()).toContain('Caused by');
    });
  });
});
