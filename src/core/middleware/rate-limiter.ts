/**
 * Rate limiting middleware for Linear API
 *
 * Linear API Limits:
 * - 1,000 requests per hour
 * - 100 requests per minute (burst limit)
 *
 * This middleware tracks API usage and prevents exceeding rate limits
 * by queueing requests when approaching thresholds.
 */

export interface RateLimitConfig {
  /** Maximum requests per hour (default: 1000) */
  maxRequestsPerHour: number;
  /** Maximum requests per minute (default: 100) */
  maxRequestsPerMinute: number;
  /** Safety margin - queue when at this percentage of limit (default: 0.9 = 90%) */
  safetyMargin: number;
  /** Enable request queuing (default: true) */
  enableQueueing: boolean;
}

export interface RateLimitInfo {
  /** Remaining requests this hour from API headers */
  remainingHour?: number;
  /** Remaining requests this minute from API headers */
  remainingMinute?: number;
  /** When the rate limit resets (Unix timestamp) */
  resetTime?: number;
  /** Retry after seconds (from 429 response) */
  retryAfter?: number;
  /** Requests made this hour (tracked locally) */
  requestsThisHour: number;
  /** Requests made this minute (tracked locally) */
  requestsThisMinute: number;
}

interface QueuedRequest {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private requestQueue: QueuedRequest[] = [];
  private processing: boolean = false;

  // Sliding window tracking
  private hourlyRequests: number[] = []; // Timestamps of requests in last hour
  private minuteRequests: number[] = []; // Timestamps of requests in last minute

  // Linear API reported limits
  private apiRemainingHour?: number;
  private apiRemainingMinute?: number;
  private apiResetTime?: number;
  private apiRetryAfter?: number;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequestsPerHour: config?.maxRequestsPerHour ?? 1000,
      maxRequestsPerMinute: config?.maxRequestsPerMinute ?? 100,
      safetyMargin: config?.safetyMargin ?? 0.9,
      enableQueueing: config?.enableQueueing ?? true,
    };
  }

  /**
   * Wait for rate limit clearance before making a request
   */
  async acquireSlot(): Promise<void> {
    // Clean old timestamps
    this.cleanOldTimestamps();

    // Check if we need to wait
    const waitTime = this.calculateWaitTime();

    if (waitTime === 0) {
      // Can proceed immediately
      this.recordRequest();
      return Promise.resolve();
    }

    // Need to wait or queue
    if (!this.config.enableQueueing) {
      throw new Error(`Rate limit reached. Wait ${waitTime}ms before retrying.`);
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Start processing queue if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Update rate limit info from Linear API response headers
   */
  updateFromHeaders(headers: Record<string, string | string[] | undefined>): void {
    // Extract rate limit headers
    const remaining = this.getHeader(headers, 'x-ratelimit-remaining');
    const limit = this.getHeader(headers, 'x-ratelimit-limit');
    const reset = this.getHeader(headers, 'x-ratelimit-reset');
    const retryAfter = this.getHeader(headers, 'retry-after');

    if (remaining) {
      this.apiRemainingHour = parseInt(remaining, 10);
    }

    if (reset) {
      this.apiResetTime = parseInt(reset, 10);
    }

    if (retryAfter) {
      this.apiRetryAfter = parseInt(retryAfter, 10);
    }

    // Log if approaching limits
    if (this.apiRemainingHour !== undefined) {
      const percentRemaining = (this.apiRemainingHour / this.config.maxRequestsPerHour) * 100;
      if (percentRemaining < 20) {
        console.warn(
          `[RateLimiter] Low quota warning: ${this.apiRemainingHour} requests remaining (${percentRemaining.toFixed(1)}%)`
        );
      }
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitInfo {
    this.cleanOldTimestamps();
    return {
      remainingHour: this.apiRemainingHour,
      remainingMinute: this.apiRemainingMinute,
      resetTime: this.apiResetTime,
      retryAfter: this.apiRetryAfter,
      requestsThisHour: this.hourlyRequests.length,
      requestsThisMinute: this.minuteRequests.length,
    };
  }

  /**
   * Check if currently throttled
   */
  isThrottled(): boolean {
    return this.calculateWaitTime() > 0;
  }

  /**
   * Reset rate limiter state (useful for testing)
   */
  reset(): void {
    this.hourlyRequests = [];
    this.minuteRequests = [];
    this.apiRemainingHour = undefined;
    this.apiRemainingMinute = undefined;
    this.apiResetTime = undefined;
    this.apiRetryAfter = undefined;
    this.requestQueue = [];
    this.processing = false;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private cleanOldTimestamps(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    // Remove requests older than 1 hour
    this.hourlyRequests = this.hourlyRequests.filter((ts) => ts > oneHourAgo);

    // Remove requests older than 1 minute
    this.minuteRequests = this.minuteRequests.filter((ts) => ts > oneMinuteAgo);
  }

  private recordRequest(): void {
    const now = Date.now();
    this.hourlyRequests.push(now);
    this.minuteRequests.push(now);
  }

  private calculateWaitTime(): number {
    const now = Date.now();
    this.cleanOldTimestamps();

    // Check if we have a retry-after from a 429 response
    if (this.apiRetryAfter && this.apiRetryAfter > 0) {
      return this.apiRetryAfter * 1000; // Convert to milliseconds
    }

    // Calculate safety thresholds
    const hourThreshold = Math.floor(this.config.maxRequestsPerHour * this.config.safetyMargin);
    const minuteThreshold = Math.floor(this.config.maxRequestsPerMinute * this.config.safetyMargin);

    // Check minute limit (more strict)
    if (this.minuteRequests.length >= minuteThreshold) {
      // Calculate when the oldest request will age out
      const oldestMinuteRequest = this.minuteRequests[0];
      const minuteWait = oldestMinuteRequest + 60 * 1000 - now;
      if (minuteWait > 0) {
        return minuteWait;
      }
    }

    // Check hour limit
    if (this.hourlyRequests.length >= hourThreshold) {
      // Calculate when the oldest request will age out
      const oldestHourRequest = this.hourlyRequests[0];
      const hourWait = oldestHourRequest + 60 * 60 * 1000 - now;
      if (hourWait > 0) {
        return hourWait;
      }
    }

    // Check API reported limits if available
    if (this.apiRemainingHour !== undefined && this.apiRemainingHour === 0) {
      if (this.apiResetTime) {
        const resetWait = this.apiResetTime * 1000 - now;
        if (resetWait > 0) {
          return resetWait;
        }
      }
    }

    return 0; // No wait needed
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const waitTime = this.calculateWaitTime();

      if (waitTime > 0) {
        // Wait before processing next request
        console.log(`[RateLimiter] Throttling: waiting ${waitTime}ms before next request`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Process next request in queue
      const request = this.requestQueue.shift();
      if (request) {
        this.recordRequest();
        request.resolve();
      }
    }

    this.processing = false;
  }
}

/**
 * Singleton rate limiter instance
 */
export const rateLimiter = new RateLimiter();
