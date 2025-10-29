/**
 * Exponential backoff retry logic for failed requests
 *
 * Automatically retries transient failures with exponential backoff:
 * - Attempt 1: 100ms delay
 * - Attempt 2: 200ms delay
 * - Attempt 3: 400ms delay
 * - Attempt 4: 800ms delay
 * - Attempt 5: 1600ms delay
 * - Plus jitter (±10%) to prevent thundering herd
 *
 * Handles:
 * - Network errors
 * - Rate limits (429)
 * - Server errors (5xx)
 * - Request timeouts (408)
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 5) */
  maxAttempts: number;
  /** Initial delay in milliseconds (default: 100) */
  baseDelay: number;
  /** Maximum delay in milliseconds (default: 30000 = 30s) */
  maxDelay: number;
  /** Jitter percentage (default: 0.1 = ±10%) */
  jitterFactor: number;
  /** Enable retry logic (default: true) */
  enabled: boolean;
}

export interface RetryContext {
  /** Current attempt number (1-based) */
  attempt: number;
  /** Total attempts made */
  totalAttempts: number;
  /** Last error encountered */
  lastError?: Error;
  /** Retry delays used (ms) */
  delays: number[];
}

export class RetryLogic {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxAttempts: config?.maxAttempts ?? 5,
      baseDelay: config?.baseDelay ?? 100,
      maxDelay: config?.maxDelay ?? 30000,
      jitterFactor: config?.jitterFactor ?? 0.1,
      enabled: config?.enabled ?? true,
    };
  }

  /**
   * Execute a function with automatic retry on transient failures
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string }
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    const retryContext: RetryContext = {
      attempt: 0,
      totalAttempts: 0,
      delays: [],
    };

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      retryContext.attempt = attempt;
      retryContext.totalAttempts = attempt;

      try {
        const result = await operation();

        // Success! Log if we had to retry
        if (attempt > 1) {
          console.log(
            `[RetryLogic] Operation succeeded after ${attempt} attempts`,
            context?.operationName ? `(${context.operationName})` : ''
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryContext.lastError = lastError;

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          // Non-retryable error - fail immediately
          throw lastError;
        }

        // Last attempt - don't wait, just throw
        if (attempt === this.config.maxAttempts) {
          console.error(
            `[RetryLogic] Operation failed after ${attempt} attempts`,
            context?.operationName ? `(${context.operationName})` : '',
            lastError.message
          );
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, lastError);
        retryContext.delays.push(delay);

        console.warn(
          `[RetryLogic] Attempt ${attempt}/${this.config.maxAttempts} failed, retrying in ${delay}ms`,
          context?.operationName ? `(${context.operationName})` : '',
          lastError.message
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Retry logic exhausted');
  }

  /**
   * Check if an error should be retried
   */
  isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network/connection errors - always retry
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('dns')
    ) {
      return true;
    }

    // Rate limit errors - retry with backoff
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Server errors (5xx) - retry
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return true;
    }

    // Request timeout (408) - retry
    if (message.includes('408') || message.includes('request timeout')) {
      return true;
    }

    // Client errors (4xx except 429) - don't retry
    if (
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('422') ||
      message.includes('bad request') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found') ||
      message.includes('validation')
    ) {
      return false;
    }

    // Default: retry for unknown errors (conservative approach)
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, error: Error): number {
    // Check if error contains Retry-After hint
    const retryAfter = this.extractRetryAfter(error);
    if (retryAfter !== null) {
      return Math.min(retryAfter * 1000, this.config.maxDelay);
    }

    // Exponential backoff: baseDelay * (2 ^ (attempt - 1))
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt - 1);

    // Add jitter (±10% by default)
    const jitter = exponentialDelay * this.config.jitterFactor;
    const jitterAmount = (Math.random() - 0.5) * 2 * jitter;
    const delayWithJitter = exponentialDelay + jitterAmount;

    // Cap at max delay
    return Math.min(delayWithJitter, this.config.maxDelay);
  }

  /**
   * Extract Retry-After value from error message
   */
  private extractRetryAfter(error: Error): number | null {
    const match = error.message.match(/retry[- ]after[:\s]+(\d+)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Singleton retry logic instance
 */
export const retryLogic = new RetryLogic();
