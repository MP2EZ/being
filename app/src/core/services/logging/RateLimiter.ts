/**
 * Token Bucket Rate Limiter - INFRA-61
 *
 * Prevents log flooding (DoS) while preserving critical crisis events.
 *
 * Algorithm: Token Bucket
 * - Capacity: Maximum burst size
 * - Refill Rate: Tokens added per interval
 * - Priority Bypass: Crisis events always allowed
 *
 * HIPAA Compliance: Prevents log storage exhaustion attacks
 * Performance: O(1) time complexity, minimal memory overhead
 */

export enum LogPriority {
  CRITICAL = 0,  // Crisis events - always allowed
  HIGH = 1,      // Security, assessment - high limit
  NORMAL = 2,    // System, sync, analytics - standard limit
  LOW = 3        // Debug, performance - lowest limit
}

export interface RateLimiterConfig {
  capacity: number;        // Maximum tokens (burst size)
  refillRate: number;      // Tokens per second
  refillInterval: number;  // Milliseconds between refills
}

export interface RateLimiterStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  currentTokens: number;
  lastRefill: number;
  byPriority: {
    [key in LogPriority]: {
      requests: number;
      allowed: number;
      blocked: number;
    };
  };
}

/**
 * Token Bucket Rate Limiter
 *
 * Limits log volume while allowing bursts and prioritizing critical events.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimiterConfig;

  // Statistics
  private stats: RateLimiterStats = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    currentTokens: 0,
    lastRefill: Date.now(),
    byPriority: {
      [LogPriority.CRITICAL]: { requests: 0, allowed: 0, blocked: 0 },
      [LogPriority.HIGH]: { requests: 0, allowed: 0, blocked: 0 },
      [LogPriority.NORMAL]: { requests: 0, allowed: 0, blocked: 0 },
      [LogPriority.LOW]: { requests: 0, allowed: 0, blocked: 0 },
    }
  };

  /**
   * Default configuration:
   * - Capacity: 100 tokens (burst of 100 logs)
   * - Refill: 10 tokens/second (600 logs/minute sustained)
   * - Interval: 100ms refill checks
   */
  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      capacity: config.capacity ?? 100,
      refillRate: config.refillRate ?? 10,
      refillInterval: config.refillInterval ?? 100,
    };

    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed < this.config.refillInterval) {
      return; // Not enough time elapsed
    }

    // Calculate tokens to add
    const intervals = Math.floor(elapsed / this.config.refillInterval);
    const tokensToAdd = intervals * (this.config.refillRate * this.config.refillInterval / 1000);

    // Add tokens up to capacity
    this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
    this.stats.currentTokens = this.tokens;
    this.stats.lastRefill = now;
  }

  /**
   * Attempt to consume tokens for a log request
   *
   * @param priority Log priority level
   * @param cost Token cost (default: 1)
   * @returns true if allowed, false if rate limited
   */
  public tryConsume(priority: LogPriority = LogPriority.NORMAL, cost: number = 1): boolean {
    // CRITICAL priority (crisis events) always bypass rate limiting
    if (priority === LogPriority.CRITICAL) {
      this.stats.totalRequests++;
      this.stats.allowedRequests++;
      this.stats.byPriority[priority].requests++;
      this.stats.byPriority[priority].allowed++;
      return true;
    }

    // Refill tokens
    this.refill();

    // Track request
    this.stats.totalRequests++;
    this.stats.byPriority[priority].requests++;

    // Check if enough tokens available
    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.stats.allowedRequests++;
      this.stats.byPriority[priority].allowed++;
      this.stats.currentTokens = this.tokens;
      return true;
    }

    // Rate limited
    this.stats.blockedRequests++;
    this.stats.byPriority[priority].blocked++;
    return false;
  }

  /**
   * Get current rate limiter statistics
   */
  public getStats(): RateLimiterStats {
    this.refill(); // Update tokens before returning stats
    return {
      ...this.stats,
      currentTokens: this.tokens,
    };
  }

  /**
   * Reset rate limiter to initial state
   */
  public reset(): void {
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      currentTokens: this.tokens,
      lastRefill: this.lastRefill,
      byPriority: {
        [LogPriority.CRITICAL]: { requests: 0, allowed: 0, blocked: 0 },
        [LogPriority.HIGH]: { requests: 0, allowed: 0, blocked: 0 },
        [LogPriority.NORMAL]: { requests: 0, allowed: 0, blocked: 0 },
        [LogPriority.LOW]: { requests: 0, allowed: 0, blocked: 0 },
      }
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): RateLimiterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (resets limiter)
   */
  public updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    this.reset();
  }
}

/**
 * Global rate limiter instance
 *
 * Configuration:
 * - 100 token capacity (burst)
 * - 10 tokens/second refill (600 logs/minute sustained)
 * - 100ms refill interval
 */
export const globalRateLimiter = new TokenBucketRateLimiter({
  capacity: 100,
  refillRate: 10,
  refillInterval: 100,
});
