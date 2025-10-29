import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RateLimiter } from '../core/middleware/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxRequestsPerHour: 1000,
      maxRequestsPerMinute: 100,
      safetyMargin: 0.9,
      enableQueueing: true,
    });
  });

  afterEach(() => {
    rateLimiter.reset();
  });

  describe('acquireSlot', () => {
    it('should allow requests under the limit', async () => {
      const start = Date.now();
      await rateLimiter.acquireSlot();
      const elapsed = Date.now() - start;

      // Should proceed immediately
      expect(elapsed).toBeLessThan(100);

      const status = rateLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(1);
      expect(status.requestsThisHour).toBe(1);
    });

    it('should track multiple requests', async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquireSlot();
      }

      const status = rateLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(5);
      expect(status.requestsThisHour).toBe(5);
    });

    it('should throttle when approaching minute limit', async () => {
      // Set up rate limiter with low minute limit for testing
      const testLimiter = new RateLimiter({
        maxRequestsPerHour: 1000,
        maxRequestsPerMinute: 10,
        safetyMargin: 0.9,
        enableQueueing: false,
      });

      // Make 9 requests (90% of 10)
      for (let i = 0; i < 9; i++) {
        await testLimiter.acquireSlot();
      }

      // 10th request should be blocked
      await expect(testLimiter.acquireSlot()).rejects.toThrow('Rate limit reached');

      testLimiter.reset();
    });

    it('should queue requests without blocking', async () => {
      const testLimiter = new RateLimiter({
        maxRequestsPerHour: 1000,
        maxRequestsPerMinute: 10,
        safetyMargin: 0.5, // 50% of 10 = 5
        enableQueueing: true,
      });

      // First 5 requests should succeed immediately
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await testLimiter.acquireSlot();
        expect(Date.now() - start).toBeLessThan(100);
      }

      // Status check - should have 5 requests recorded
      const status = testLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(5);

      testLimiter.reset();
    });

    it('should clean old timestamps correctly', async () => {
      // Make a request
      await rateLimiter.acquireSlot();

      const status1 = rateLimiter.getStatus();
      expect(status1.requestsThisMinute).toBe(1);

      // Wait slightly (simulate time passing)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Status should still show 1 (within the minute)
      const status2 = rateLimiter.getStatus();
      expect(status2.requestsThisMinute).toBe(1);
    });
  });

  describe('updateFromHeaders', () => {
    it('should parse rate limit headers correctly', () => {
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '850',
        'x-ratelimit-limit': '1000',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      });

      const status = rateLimiter.getStatus();
      expect(status.remainingHour).toBe(850);
      expect(status.resetTime).toBeGreaterThan(Date.now() / 1000);
    });

    it('should handle array header values', () => {
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': ['750'],
        'x-ratelimit-limit': ['1000'],
      });

      const status = rateLimiter.getStatus();
      expect(status.remainingHour).toBe(750);
    });

    it('should parse retry-after header', () => {
      rateLimiter.updateFromHeaders({
        'retry-after': '60',
      });

      const status = rateLimiter.getStatus();
      expect(status.retryAfter).toBe(60);
    });

    it('should warn when quota is low', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Update with low remaining quota (15% remaining)
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '150',
        'x-ratelimit-limit': '1000',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Low quota warning: 150 requests remaining')
      );

      warnSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit status', async () => {
      await rateLimiter.acquireSlot();
      await rateLimiter.acquireSlot();

      const status = rateLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(2);
      expect(status.requestsThisHour).toBe(2);
    });

    it('should include API reported limits if available', () => {
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '925',
      });

      const status = rateLimiter.getStatus();
      expect(status.remainingHour).toBe(925);
    });
  });

  describe('isThrottled', () => {
    it('should return false when under limits', async () => {
      await rateLimiter.acquireSlot();
      expect(rateLimiter.isThrottled()).toBe(false);
    });

    it('should return true when at safety threshold', async () => {
      const testLimiter = new RateLimiter({
        maxRequestsPerHour: 1000,
        maxRequestsPerMinute: 2,
        safetyMargin: 0.5, // 50% = 1 request
        enableQueueing: false,
      });

      await testLimiter.acquireSlot();
      expect(testLimiter.isThrottled()).toBe(true);

      testLimiter.reset();
    });

    it('should return true when retry-after is set', () => {
      rateLimiter.updateFromHeaders({
        'retry-after': '30',
      });

      expect(rateLimiter.isThrottled()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all tracking state', async () => {
      // Make some requests
      await rateLimiter.acquireSlot();
      await rateLimiter.acquireSlot();

      // Update from headers
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '850',
      });

      // Reset
      rateLimiter.reset();

      // Verify all state cleared
      const status = rateLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(0);
      expect(status.requestsThisHour).toBe(0);
      expect(status.remainingHour).toBeUndefined();
      expect(status.retryAfter).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing headers gracefully', () => {
      // Should not throw
      rateLimiter.updateFromHeaders({});

      const status = rateLimiter.getStatus();
      expect(status.remainingHour).toBeUndefined();
    });

    it('should handle invalid header values', () => {
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': 'invalid',
        'x-ratelimit-reset': 'not-a-number',
      });

      const status = rateLimiter.getStatus();
      // Should parse as NaN but not crash
      expect(status).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      // Launch 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => rateLimiter.acquireSlot());

      await Promise.all(promises);

      const status = rateLimiter.getStatus();
      expect(status.requestsThisMinute).toBe(10);
      expect(status.requestsThisHour).toBe(10);
    });
  });
});
