import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MonitoringHandler } from '../features/monitoring/handlers/monitoring.handler';
import { LinearAuth } from '../auth';
import { rateLimiter } from '../core/middleware/rate-limiter';

describe('MonitoringHandler', () => {
  let monitoringHandler: MonitoringHandler;
  let auth: LinearAuth;

  beforeEach(() => {
    // Initialize with API key for testing
    auth = new LinearAuth();
    auth.initialize({
      type: 'api',
      apiKey: 'test-api-key',
    });

    monitoringHandler = new MonitoringHandler(auth);

    // Reset rate limiter before each test
    rateLimiter.reset();
  });

  afterEach(() => {
    rateLimiter.reset();
  });

  describe('handleGetRateLimitStatus', () => {
    it('should return rate limit status with no usage', async () => {
      const result = await monitoringHandler.handleGetRateLimitStatus();

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('ok');
      expect(response.warningLevel).toBe('normal');
      expect(response.isThrottled).toBe(false);
      expect(response.usage.requestsThisHour).toBe(0);
      expect(response.usage.requestsThisMinute).toBe(0);
      expect(response.limits.maxPerHour).toBe(1000);
      expect(response.limits.maxPerMinute).toBe(100);
    });

    it('should show usage after requests', async () => {
      // Simulate some requests
      await rateLimiter.acquireSlot();
      await rateLimiter.acquireSlot();
      await rateLimiter.acquireSlot();

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      expect(response.usage.requestsThisHour).toBe(3);
      expect(response.usage.requestsThisMinute).toBe(3);
      expect(response.usage.hourlyUsagePercent).toBe(0.3); // 3/1000 = 0.3%
      expect(response.usage.minuteUsagePercent).toBe(3.0); // 3/100 = 3%
    });

    it('should show warning level when approaching limits', async () => {
      // Update rate limiter to simulate API reporting we're at 85% usage
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '150', // 850 used out of 1000 = 85%
      });

      // Simulate 85 local requests (85% of minute limit - under 90% safety threshold)
      // Note: Using fewer iterations to avoid hitting rate limiter's 90% queue threshold
      for (let i = 0; i < 85; i++) {
        await rateLimiter.acquireSlot();
      }

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      expect(response.warningLevel).toBe('warning');
      // Local tracking shows 85 requests out of 1000 = 8.5%
      expect(response.usage.hourlyUsagePercent).toBe(8.5);
      // But API headers show 150 remaining = 85% used, which triggers warning
      expect(response.quota.remainingHour).toBe(150);
    });

    it('should show critical level when near limits', async () => {
      // Make just enough requests to show the tracking works, stay under 90% queue threshold
      for (let i = 0; i < 50; i++) {
        await rateLimiter.acquireSlot();
      }

      // Update API headers to indicate we're at critical usage overall
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '40', // 960 used out of 1000 = 96% (critical)
      });

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      // Should show critical because API headers show < 5% remaining
      expect(response.warningLevel).toBe('critical');
      expect(response.quota.remainingHour).toBe(40);
    });

    it('should include API reported quota when available', async () => {
      // Update rate limiter with API headers
      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '750',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      });

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      expect(response.quota.remainingHour).toBe(750);
      expect(response.quota.resetTime).toContain('in');
      expect(response.quota.resetTime).toContain('s)');
    });

    it('should show retry-after when set', async () => {
      rateLimiter.updateFromHeaders({
        'retry-after': '60',
      });

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      expect(response.quota.retryAfter).toBe('60s');
    });

    it('should indicate throttled status correctly', async () => {
      // Set retry-after to trigger throttle
      rateLimiter.updateFromHeaders({
        'retry-after': '30',
      });

      const result = await monitoringHandler.handleGetRateLimitStatus();
      const response = JSON.parse(result.content[0].text);

      expect(response.isThrottled).toBe(true);
    });

    it('should log warnings for high usage', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate 85 requests (85% of minute limit - warning threshold)
      for (let i = 0; i < 85; i++) {
        await rateLimiter.acquireSlot();
      }

      await monitoringHandler.handleGetRateLimitStatus();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimitMonitor] WARNING')
      );

      warnSpy.mockRestore();
    });

    it('should log errors for critical usage', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Make enough requests to hit minute critical threshold (96 out of 100)
      // But this will hit the 90% queue, so just make less and verify warning logic
      for (let i = 0; i < 50; i++) {
        await rateLimiter.acquireSlot();
      }

      rateLimiter.updateFromHeaders({
        'x-ratelimit-remaining': '40', // Critical: only 4% remaining
      });

      await monitoringHandler.handleGetRateLimitStatus();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimitMonitor] CRITICAL')
      );

      errorSpy.mockRestore();
    });
  });
});
