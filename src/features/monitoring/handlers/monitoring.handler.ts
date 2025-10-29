import { BaseHandler } from '../../../core/handlers/base.handler.js';
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js';
import { LinearAuth } from '../../../auth.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';
import { rateLimiter } from '../../../core/middleware/rate-limiter.js';

/**
 * Handler for monitoring and observability operations.
 * Provides visibility into rate limiting, quota usage, and system health.
 */
export class MonitoringHandler extends BaseHandler {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Get current rate limit status and quota information.
   * Returns real-time metrics from the rate limiter.
   */
  async handleGetRateLimitStatus(): Promise<BaseToolResponse> {
    try {
      const status = rateLimiter.getStatus();
      const isThrottled = rateLimiter.isThrottled();

      // Calculate usage percentages
      const hourlyUsagePercent = (status.requestsThisHour / 1000) * 100;
      const minuteUsagePercent = (status.requestsThisMinute / 100) * 100;

      // Also check API-reported quota if available
      let apiQuotaPercent = 100;
      if (status.remainingHour !== undefined) {
        apiQuotaPercent = (status.remainingHour / 1000) * 100;
      }

      // Determine warning level (use worst case from local tracking or API quota)
      const worstUsagePercent = Math.max(
        hourlyUsagePercent,
        minuteUsagePercent,
        100 - apiQuotaPercent  // Convert remaining to used percentage
      );

      let warningLevel = 'normal';
      if (worstUsagePercent >= 95) {
        warningLevel = 'critical';
      } else if (worstUsagePercent >= 80) {
        warningLevel = 'warning';
      }

      // Format reset time
      let resetTimeFormatted = 'unknown';
      if (status.resetTime) {
        const resetDate = new Date(status.resetTime * 1000);
        const now = new Date();
        const secondsUntilReset = Math.floor((resetDate.getTime() - now.getTime()) / 1000);
        resetTimeFormatted = `${resetDate.toISOString()} (in ${secondsUntilReset}s)`;
      }

      const response = {
        status: 'ok',
        warningLevel,
        isThrottled,
        usage: {
          requestsThisHour: status.requestsThisHour,
          requestsThisMinute: status.requestsThisMinute,
          hourlyUsagePercent: Math.round(hourlyUsagePercent * 10) / 10,
          minuteUsagePercent: Math.round(minuteUsagePercent * 10) / 10,
        },
        quota: {
          remainingHour: status.remainingHour ?? 'unknown',
          remainingMinute: status.remainingMinute ?? 'unknown',
          resetTime: resetTimeFormatted,
          retryAfter: status.retryAfter ? `${status.retryAfter}s` : null,
        },
        limits: {
          maxPerHour: 1000,
          maxPerMinute: 100,
          safetyThreshold: '90%',
        },
      };

      // Log warnings if needed
      if (warningLevel === 'critical') {
        console.error(
          `[RateLimitMonitor] CRITICAL: Rate limit usage at ${worstUsagePercent.toFixed(1)}%`
        );
      } else if (warningLevel === 'warning') {
        console.warn(
          `[RateLimitMonitor] WARNING: Rate limit usage at ${worstUsagePercent.toFixed(1)}%`
        );
      }

      return this.createJsonResponse(response);
    } catch (error) {
      this.handleError(error, 'get rate limit status');
    }
  }
}
