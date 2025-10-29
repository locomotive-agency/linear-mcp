import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RetryLogic } from '../core/middleware/retry-logic';

describe('RetryLogic', () => {
  let retryLogic: RetryLogic;

  beforeEach(() => {
    retryLogic = new RetryLogic({
      maxAttempts: 5,
      baseDelay: 100,
      maxDelay: 30000,
      jitterFactor: 0.1,
      enabled: true,
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt when operation works', async () => {
      const operation = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const result = await retryLogic.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failure and eventually succeed', async () => {
      const operation = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('503 Service unavailable'))
        .mockResolvedValueOnce('success');

      const result = await retryLogic.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Network timeout'));

      await expect(retryLogic.executeWithRetry(operation)).rejects.toThrow('Network timeout');

      expect(operation).toHaveBeenCalledTimes(5); // maxAttempts
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('404 Not found'));

      await expect(retryLogic.executeWithRetry(operation)).rejects.toThrow('404 Not found');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should bypass retry when disabled', async () => {
      const disabledRetry = new RetryLogic({ enabled: false });
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Network timeout'));

      await expect(disabledRetry.executeWithRetry(operation)).rejects.toThrow('Network timeout');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should apply exponential backoff delays', async () => {
      const testRetry = new RetryLogic({
        maxAttempts: 3,
        baseDelay: 100,
        jitterFactor: 0, // No jitter for predictable testing
      });

      const delays: number[] = [];
      const operation = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        if (delays.length < 2) {
          delays.push(Date.now());
          throw new Error('Network timeout');
        }
        delays.push(Date.now());
        return 'success';
      });

      await testRetry.executeWithRetry(operation);

      // Check that delays are approximately exponential
      // Attempt 1: immediate
      // Attempt 2: ~100ms after attempt 1
      // Attempt 3: ~200ms after attempt 2
      expect(operation).toHaveBeenCalledTimes(3);

      // Verify delays increased (with some tolerance for timing variance)
      if (delays.length === 3) {
        const delay1 = delays[1] - delays[0];
        const delay2 = delays[2] - delays[1];

        expect(delay1).toBeGreaterThanOrEqual(80); // ~100ms ±20%
        expect(delay1).toBeLessThanOrEqual(120);

        expect(delay2).toBeGreaterThanOrEqual(180); // ~200ms ±20%
        expect(delay2).toBeLessThanOrEqual(220);
      }
    }, 10000);
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const errors = [
        new Error('Network timeout'),
        new Error('ECONNREFUSED'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('DNS lookup failed'),
      ];

      errors.forEach((error) => {
        expect(retryLogic.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify rate limit errors as retryable', () => {
      const errors = [
        new Error('Rate limit exceeded'),
        new Error('429 Too Many Requests'),
        new Error('GraphQL operation failed: rate limit'),
      ];

      errors.forEach((error) => {
        expect(retryLogic.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify server errors (5xx) as retryable', () => {
      const errors = [
        new Error('500 Internal Server Error'),
        new Error('502 Bad Gateway'),
        new Error('503 Service Unavailable'),
        new Error('504 Gateway Timeout'),
      ];

      errors.forEach((error) => {
        expect(retryLogic.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify request timeouts (408) as retryable', () => {
      const errors = [
        new Error('408 Request Timeout'),
        new Error('Request timeout'),
      ];

      errors.forEach((error) => {
        expect(retryLogic.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify client errors (4xx except 429) as non-retryable', () => {
      const errors = [
        new Error('400 Bad Request'),
        new Error('401 Unauthorized'),
        new Error('403 Forbidden'),
        new Error('404 Not Found'),
        new Error('422 Validation Failed'),
      ];

      errors.forEach((error) => {
        expect(retryLogic.isRetryableError(error)).toBe(false);
      });
    });

    it('should default to retryable for unknown errors', () => {
      const error = new Error('Some unknown error');
      expect(retryLogic.isRetryableError(error)).toBe(true);
    });
  });

  describe('exponential backoff calculation', () => {
    it('should calculate exponential delays correctly', async () => {
      const testRetry = new RetryLogic({
        maxAttempts: 5,
        baseDelay: 100,
        jitterFactor: 0, // No jitter for testing
      });

      const delays: number[] = [];
      let attemptCount = 0;

      const operation = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 5) {
          delays.push(Date.now());
          throw new Error('Network timeout');
        }
        delays.push(Date.now());
        return 'success';
      });

      await testRetry.executeWithRetry(operation);

      expect(operation).toHaveBeenCalledTimes(5);

      // Expected delays: 0, 100, 200, 400, 800 (cumulative)
      // We're checking the intervals between attempts
      if (delays.length === 5) {
        const intervals = [];
        for (let i = 1; i < delays.length; i++) {
          intervals.push(delays[i] - delays[i - 1]);
        }

        // Allow ±20% tolerance for timing variance
        expect(intervals[0]).toBeGreaterThanOrEqual(80); // ~100ms
        expect(intervals[1]).toBeGreaterThanOrEqual(180); // ~200ms
        expect(intervals[2]).toBeGreaterThanOrEqual(380); // ~400ms
        expect(intervals[3]).toBeGreaterThanOrEqual(780); // ~800ms
      }
    }, 15000);

    it('should cap delay at maxDelay', async () => {
      const testRetry = new RetryLogic({
        maxAttempts: 2,
        baseDelay: 100,
        maxDelay: 150, // Cap at 150ms
        jitterFactor: 0,
      });

      const delays: number[] = [];
      const operation = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        delays.push(Date.now());
        if (delays.length < 2) {
          throw new Error('Network timeout');
        }
        return 'success';
      });

      await testRetry.executeWithRetry(operation);

      if (delays.length === 2) {
        const interval = delays[1] - delays[0];
        // Should be capped at maxDelay (150ms), not exponential (200ms)
        expect(interval).toBeLessThan(170);
      }
    }, 5000);

    it('should add jitter to prevent thundering herd', async () => {
      const testRetry = new RetryLogic({
        maxAttempts: 2,
        baseDelay: 100,
        jitterFactor: 0.5, // High jitter for testing
      });

      const delays1: number[] = [];
      const delays2: number[] = [];

      const operation1 = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        delays1.push(Date.now());
        if (delays1.length < 2) throw new Error('timeout');
        return 'success';
      });

      const operation2 = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        delays2.push(Date.now());
        if (delays2.length < 2) throw new Error('timeout');
        return 'success';
      });

      await Promise.all([
        testRetry.executeWithRetry(operation1),
        testRetry.executeWithRetry(operation2),
      ]);

      // With jitter, the delays should be different
      if (delays1.length === 2 && delays2.length === 2) {
        const interval1 = delays1[1] - delays1[0];
        const interval2 = delays2[1] - delays2[0];

        // They should be different due to jitter (not exactly the same)
        // With 50% jitter, there's a very high chance they differ
        const difference = Math.abs(interval1 - interval2);
        expect(difference).toBeGreaterThan(0);
      }
    }, 10000);
  });

  describe('Retry-After header handling', () => {
    it('should extract Retry-After from error message', async () => {
      const testRetry = new RetryLogic({
        maxAttempts: 2,
        baseDelay: 100,
      });

      const startTime = Date.now();
      const operation = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Rate limit: Retry-After: 1'))
        .mockResolvedValueOnce('success');

      await testRetry.executeWithRetry(operation);

      const elapsed = Date.now() - startTime;

      // Should wait ~1 second (1000ms) not the default 100ms
      expect(elapsed).toBeGreaterThanOrEqual(900);
      expect(operation).toHaveBeenCalledTimes(2);
    }, 5000);
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = retryLogic.getConfig();

      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(100);
      expect(config.maxDelay).toBe(30000);
      expect(config.jitterFactor).toBe(0.1);
      expect(config.enabled).toBe(true);
    });
  });
});
