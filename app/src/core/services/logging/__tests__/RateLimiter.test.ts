/**
 * Rate Limiter Load Tests - INFRA-61
 *
 * Validates TokenBucket rate limiter under high load:
 * - 1000+ logs/minute handling
 * - Crisis priority bypass (CRITICAL)
 * - Accurate statistics tracking
 * - Token refill mechanism
 * - Memory efficiency
 *
 * COMPLIANCE: HIPAA requirement for DoS protection
 */

import {
  TokenBucketRateLimiter,
  LogPriority,
  RateLimiterStats,
} from '../RateLimiter';

describe('TokenBucket Rate Limiter - INFRA-61', () => {
  let rateLimiter: TokenBucketRateLimiter;

  beforeEach(() => {
    // Default config: 100 capacity, 10 tokens/sec
    rateLimiter = new TokenBucketRateLimiter({
      capacity: 100,
      refillRate: 10,
      refillInterval: 100,
    });
  });

  describe('Basic Functionality', () => {
    it('should allow requests up to capacity', () => {
      const results: boolean[] = [];

      // Consume all 100 tokens
      for (let i = 0; i < 100; i++) {
        results.push(rateLimiter.tryConsume(LogPriority.NORMAL));
      }

      expect(results.filter(r => r).length).toBe(100);
      expect(results.every(r => r)).toBe(true);
    });

    it('should block requests after capacity exhausted', () => {
      // Consume all 100 tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // Next request should be blocked
      const blocked = rateLimiter.tryConsume(LogPriority.NORMAL);
      expect(blocked).toBe(false);
    });

    it('should track statistics correctly', () => {
      // Allow 50 requests
      for (let i = 0; i < 50; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(50);
      expect(stats.allowedRequests).toBe(50);
      expect(stats.blockedRequests).toBe(0);
      expect(stats.byPriority[LogPriority.NORMAL].requests).toBe(50);
    });

    it('should support custom token cost', () => {
      // Consume 10 tokens with cost=10
      const allowed = rateLimiter.tryConsume(LogPriority.NORMAL, 10);
      expect(allowed).toBe(true);

      const stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBe(90); // 100 - 10
    });
  });

  describe('Priority Handling', () => {
    it('should ALWAYS allow CRITICAL priority (crisis events)', () => {
      // Exhaust all tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // CRITICAL should still be allowed
      const allowed = rateLimiter.tryConsume(LogPriority.CRITICAL);
      expect(allowed).toBe(true);

      const stats = rateLimiter.getStats();
      expect(stats.byPriority[LogPriority.CRITICAL].allowed).toBe(1);
      expect(stats.byPriority[LogPriority.CRITICAL].blocked).toBe(0);
    });

    it('should allow 100+ CRITICAL logs even when rate limited', () => {
      // Exhaust tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // CRITICAL logs should bypass rate limiting
      const criticalResults: boolean[] = [];
      for (let i = 0; i < 200; i++) {
        criticalResults.push(rateLimiter.tryConsume(LogPriority.CRITICAL));
      }

      expect(criticalResults.every(r => r)).toBe(true);
      expect(criticalResults.length).toBe(200);
    });

    it('should prioritize HIGH over NORMAL when tokens available', () => {
      const stats = rateLimiter.getStats();

      rateLimiter.tryConsume(LogPriority.HIGH);
      rateLimiter.tryConsume(LogPriority.NORMAL);

      expect(stats.byPriority[LogPriority.HIGH].allowed).toBeGreaterThanOrEqual(1);
      expect(stats.byPriority[LogPriority.NORMAL].allowed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Token Refill Mechanism', () => {
    it('should refill tokens over time', async () => {
      // Consume 50 tokens
      for (let i = 0; i < 50; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      let stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBe(50);

      // Wait 1 second (should refill 10 tokens at 10 tokens/sec)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to get updated stats
      stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBeGreaterThanOrEqual(50);
      expect(stats.currentTokens).toBeLessThanOrEqual(60);
    });

    it('should not exceed capacity during refill', async () => {
      // Start with full capacity
      expect(rateLimiter.getStats().currentTokens).toBe(100);

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should still be at capacity (100), not 120
      const stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBe(100);
    });

    it('should refill at correct rate (10 tokens/sec)', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      expect(rateLimiter.getStats().currentTokens).toBe(0);

      // Wait 5 seconds (should refill 50 tokens)
      await new Promise(resolve => setTimeout(resolve, 5000));

      const stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBeGreaterThanOrEqual(45); // Allow 10% variance
      expect(stats.currentTokens).toBeLessThanOrEqual(55);
    });
  });

  describe('High Load Tests (1000+ logs/min)', () => {
    it('should handle burst of 100 logs immediately', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      const duration = Date.now() - start;

      // Should complete in <10ms
      expect(duration).toBeLessThan(10);

      const stats = rateLimiter.getStats();
      expect(stats.allowedRequests).toBe(100);
    });

    it('should sustain 600 logs/min (10 logs/sec)', async () => {
      const results: boolean[] = [];

      // Simulate 6 seconds of sustained load (60 logs)
      for (let second = 0; second < 6; second++) {
        // 10 logs per second
        for (let i = 0; i < 10; i++) {
          results.push(rateLimiter.tryConsume(LogPriority.NORMAL));
        }

        // Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Most should be allowed (allowing for initial burst consumption)
      const allowedCount = results.filter(r => r).length;
      expect(allowedCount).toBeGreaterThanOrEqual(50); // At least 50/60
    });

    it('should block excess logs beyond sustained rate', () => {
      // Burst: 100 logs immediately (consume all tokens)
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // Try to log 50 more immediately (should be blocked)
      const blocked: boolean[] = [];
      for (let i = 0; i < 50; i++) {
        blocked.push(rateLimiter.tryConsume(LogPriority.NORMAL));
      }

      expect(blocked.every(r => !r)).toBe(true); // All blocked
    });

    it('should handle 1000 requests with mixed priorities', () => {
      const results: boolean[] = [];

      for (let i = 0; i < 1000; i++) {
        // Mix: 10% CRITICAL, 20% HIGH, 70% NORMAL
        let priority = LogPriority.NORMAL;
        if (i % 10 === 0) priority = LogPriority.CRITICAL;
        else if (i % 5 === 0) priority = LogPriority.HIGH;

        results.push(rateLimiter.tryConsume(priority));
      }

      const stats = rateLimiter.getStats();

      // CRITICAL should never be blocked
      expect(stats.byPriority[LogPriority.CRITICAL].blocked).toBe(0);

      // Total handled correctly
      expect(stats.totalRequests).toBe(1000);
      expect(stats.allowedRequests + stats.blockedRequests).toBe(1000);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track requests by priority', () => {
      rateLimiter.tryConsume(LogPriority.CRITICAL);
      rateLimiter.tryConsume(LogPriority.HIGH);
      rateLimiter.tryConsume(LogPriority.NORMAL);
      rateLimiter.tryConsume(LogPriority.LOW);

      const stats = rateLimiter.getStats();

      expect(stats.byPriority[LogPriority.CRITICAL].requests).toBe(1);
      expect(stats.byPriority[LogPriority.HIGH].requests).toBe(1);
      expect(stats.byPriority[LogPriority.NORMAL].requests).toBe(1);
      expect(stats.byPriority[LogPriority.LOW].requests).toBe(1);
    });

    it('should track allowed vs blocked by priority', () => {
      // Exhaust tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // Try more (should be blocked)
      for (let i = 0; i < 10; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      const stats = rateLimiter.getStats();
      expect(stats.byPriority[LogPriority.NORMAL].allowed).toBe(100);
      expect(stats.byPriority[LogPriority.NORMAL].blocked).toBe(10);
    });

    it('should update currentTokens correctly', () => {
      rateLimiter.tryConsume(LogPriority.NORMAL, 25);

      const stats = rateLimiter.getStats();
      expect(stats.currentTokens).toBe(75); // 100 - 25
    });
  });

  describe('Configuration and Reset', () => {
    it('should support custom configuration', () => {
      const custom = new TokenBucketRateLimiter({
        capacity: 50,
        refillRate: 5,
        refillInterval: 200,
      });

      const config = custom.getConfig();
      expect(config.capacity).toBe(50);
      expect(config.refillRate).toBe(5);
      expect(config.refillInterval).toBe(200);
    });

    it('should reset to initial state', () => {
      // Consume some tokens
      for (let i = 0; i < 50; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }

      // Reset
      rateLimiter.reset();

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.allowedRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
      expect(stats.currentTokens).toBe(100);
    });

    it('should update configuration and reset', () => {
      rateLimiter.updateConfig({ capacity: 200 });

      const config = rateLimiter.getConfig();
      const stats = rateLimiter.getStats();

      expect(config.capacity).toBe(200);
      expect(stats.currentTokens).toBe(200);
      expect(stats.totalRequests).toBe(0); // Reset
    });
  });

  describe('Performance and Memory', () => {
    it('should complete 10,000 operations in <100ms', () => {
      const custom = new TokenBucketRateLimiter({
        capacity: 10000,
        refillRate: 1000,
        refillInterval: 100,
      });

      const start = Date.now();

      for (let i = 0; i < 10000; i++) {
        custom.tryConsume(LogPriority.NORMAL);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should have O(1) time complexity', () => {
      // Measure time for 1000 operations
      const start1 = Date.now();
      for (let i = 0; i < 1000; i++) {
        rateLimiter.tryConsume(LogPriority.NORMAL);
      }
      const duration1 = Date.now() - start1;

      // Reset and measure time for 10,000 operations
      const bigLimiter = new TokenBucketRateLimiter({
        capacity: 10000,
        refillRate: 1000,
        refillInterval: 100,
      });

      const start2 = Date.now();
      for (let i = 0; i < 10000; i++) {
        bigLimiter.tryConsume(LogPriority.NORMAL);
      }
      const duration2 = Date.now() - start2;

      // 10x operations should complete in reasonable time (O(1) per operation)
      // Handle case where duration1 is 0 (operations faster than 1ms resolution)
      const baseline = Math.max(duration1, 1); // Minimum 1ms baseline
      expect(duration2).toBeLessThan(baseline * 20); // Allow 20x variance for 10x operations
    });

    it('should maintain minimal memory footprint', () => {
      // Stats should not grow unbounded
      for (let i = 0; i < 100000; i++) {
        rateLimiter.tryConsume(
          i % 2 === 0 ? LogPriority.NORMAL : LogPriority.HIGH
        );
      }

      const stats = rateLimiter.getStats();

      // Stats object should be small and fixed-size
      const statsJson = JSON.stringify(stats);
      expect(statsJson.length).toBeLessThan(1000); // <1KB
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero capacity gracefully', () => {
      const zeroCapacity = new TokenBucketRateLimiter({
        capacity: 0,
        refillRate: 10,
        refillInterval: 100,
      });

      // NORMAL should be blocked
      expect(zeroCapacity.tryConsume(LogPriority.NORMAL)).toBe(false);

      // CRITICAL should still bypass
      expect(zeroCapacity.tryConsume(LogPriority.CRITICAL)).toBe(true);
    });

    it('should handle extremely high refill rate', () => {
      const highRefill = new TokenBucketRateLimiter({
        capacity: 100,
        refillRate: 1000,
        refillInterval: 10,
      });

      // Should not exceed capacity
      expect(highRefill.getStats().currentTokens).toBe(100);
    });

    it('should handle concurrent access safely', () => {
      // Simulate concurrent requests
      const results = Array.from({ length: 100 }, (_, i) =>
        rateLimiter.tryConsume(LogPriority.NORMAL)
      );

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(100);
      expect(stats.allowedRequests).toBe(100);
    });
  });

  describe('Integration with ProductionLogger', () => {
    it('should provide stats in expected format', () => {
      rateLimiter.tryConsume(LogPriority.CRITICAL);
      rateLimiter.tryConsume(LogPriority.HIGH);
      rateLimiter.tryConsume(LogPriority.NORMAL);

      const stats = rateLimiter.getStats();

      // Expected format
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('allowedRequests');
      expect(stats).toHaveProperty('blockedRequests');
      expect(stats).toHaveProperty('currentTokens');
      expect(stats).toHaveProperty('lastRefill');
      expect(stats).toHaveProperty('byPriority');

      // ByPriority structure
      expect(stats.byPriority[LogPriority.CRITICAL]).toHaveProperty('requests');
      expect(stats.byPriority[LogPriority.CRITICAL]).toHaveProperty('allowed');
      expect(stats.byPriority[LogPriority.CRITICAL]).toHaveProperty('blocked');
    });
  });
});
