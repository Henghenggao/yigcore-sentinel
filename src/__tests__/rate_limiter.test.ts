/**
 * Unit tests for RateLimiter (TokenBucket and Semaphore)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenBucket, Semaphore } from '../rate_limiter';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('Initialization', () => {
    it('should initialize with full capacity', () => {
      const bucket = new TokenBucket({ capacity: 100, refillRate: 10 });

      expect(bucket.tryConsume(100)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should use default options', () => {
      const bucket = new TokenBucket();

      expect(bucket.tryConsume(100)).toBe(true); // Default capacity: 100
    });

    it('should handle zero capacity', () => {
      const bucket = new TokenBucket({ capacity: 0, refillRate: 10 });

      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should handle large capacity', () => {
      const bucket = new TokenBucket({ capacity: 1000000, refillRate: 100 });

      expect(bucket.tryConsume(500000)).toBe(true);
      expect(bucket.tryConsume(500000)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);
    });
  });

  describe('Token Consumption', () => {
    it('should consume tokens when available', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should consume one token by default', () => {
      const bucket = new TokenBucket({ capacity: 3, refillRate: 1 });

      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(false);
    });

    it('should reject when insufficient tokens', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.tryConsume(6)).toBe(false); // Only 5 tokens left
      expect(bucket.tryConsume(5)).toBe(true);  // Can still consume remaining 5
    });

    it('should handle zero token consumption', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.tryConsume(0)).toBe(true);
      expect(bucket.tryConsume(10)).toBe(true); // All tokens still available
    });

    it('should reject negative token consumption', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.tryConsume(-5)).toBe(false);
    });

    it('should handle consuming more tokens than capacity', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.tryConsume(15)).toBe(false);
    });
  });

  describe('Token Refill', () => {
    it('should refill tokens over time', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 }); // 5 tokens/sec

      bucket.tryConsume(10); // Consume all tokens
      expect(bucket.tryConsume(1)).toBe(false);

      // Advance time by 1 second -> +5 tokens
      vi.advanceTimersByTime(1000);
      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);

      // Advance time by another 1 second -> +5 tokens
      vi.advanceTimersByTime(1000);
      expect(bucket.tryConsume(5)).toBe(true);
    });

    it('should refill fractional tokens correctly', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 10 }); // 10 tokens/sec

      bucket.tryConsume(10);

      // Advance by 500ms -> +5 tokens
      vi.advanceTimersByTime(500);
      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);

      // Advance by 100ms -> +1 token
      vi.advanceTimersByTime(100);
      expect(bucket.tryConsume(1)).toBe(true);
    });

    it('should not exceed capacity when refilling', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 });

      bucket.tryConsume(5); // 5 tokens left

      // Advance time by 10 seconds (would refill 50 tokens, but capped at capacity)
      vi.advanceTimersByTime(10000);

      expect(bucket.tryConsume(10)).toBe(true);  // Can consume up to capacity
      expect(bucket.tryConsume(1)).toBe(false);  // Cannot exceed capacity
    });

    it('should handle zero refill rate', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 0 });

      bucket.tryConsume(10);

      // Advance time (no refill expected)
      vi.advanceTimersByTime(10000);
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should handle very fast refill rate', () => {
      const bucket = new TokenBucket({ capacity: 1000, refillRate: 1000 });

      bucket.tryConsume(1000);

      // Advance by 1ms -> +1 token
      vi.advanceTimersByTime(1);
      expect(bucket.tryConsume(1)).toBe(true);

      // Advance by 1 second -> +1000 tokens (capped at capacity)
      vi.advanceTimersByTime(1000);
      expect(bucket.tryConsume(1000)).toBe(true);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return current token count', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 });

      expect(bucket.getAvailableTokens()).toBe(10);

      bucket.tryConsume(3);
      expect(bucket.getAvailableTokens()).toBe(7);

      bucket.tryConsume(7);
      expect(bucket.getAvailableTokens()).toBe(0);
    });

    it('should reflect refilled tokens', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 10 });

      bucket.tryConsume(10);
      expect(bucket.getAvailableTokens()).toBe(0);

      vi.advanceTimersByTime(500); // +5 tokens
      expect(bucket.getAvailableTokens()).toBe(5);

      vi.advanceTimersByTime(500); // +5 tokens (capped at 10)
      expect(bucket.getAvailableTokens()).toBe(10);
    });

    it('should not exceed capacity', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 });

      vi.advanceTimersByTime(10000); // Way past capacity refill
      expect(bucket.getAvailableTokens()).toBe(10);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical API rate limiting (100 req/sec)', () => {
      const bucket = new TokenBucket({ capacity: 100, refillRate: 100 });

      // Burst: consume 100 requests immediately
      for (let i = 0; i < 100; i++) {
        expect(bucket.tryConsume(1)).toBe(true);
      }
      expect(bucket.tryConsume(1)).toBe(false);

      // Wait 1 second -> refill 100 tokens
      vi.advanceTimersByTime(1000);

      // Can consume 100 more
      for (let i = 0; i < 100; i++) {
        expect(bucket.tryConsume(1)).toBe(true);
      }
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should handle sustained rate (10 req/sec)', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 10 });

      // Consume all tokens
      bucket.tryConsume(10);

      // Simulate sustained rate: 1 request every 100ms
      for (let i = 0; i < 50; i++) {
        vi.advanceTimersByTime(100); // +1 token
        expect(bucket.tryConsume(1)).toBe(true);
      }
    });

    it('should handle bursty traffic with recovery', () => {
      const bucket = new TokenBucket({ capacity: 50, refillRate: 10 });

      // Burst 1: consume 50 tokens
      expect(bucket.tryConsume(50)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);

      // Wait 5 seconds -> refill 50 tokens (capped at capacity)
      vi.advanceTimersByTime(5000);

      // Burst 2: consume 50 tokens again
      expect(bucket.tryConsume(50)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should throttle when sustained rate exceeds refill rate', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 }); // 5 req/sec

      bucket.tryConsume(10); // Use up initial burst

      // Try to sustain 10 req/sec (exceeds refill rate)
      let successCount = 0;
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(100); // Every 100ms
        if (bucket.tryConsume(1)) {
          successCount++;
        }
      }

      // Should allow approximately 5 req/sec = 50 requests over 10 seconds
      expect(successCount).toBeGreaterThanOrEqual(45);
      expect(successCount).toBeLessThanOrEqual(55);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small capacity', () => {
      const bucket = new TokenBucket({ capacity: 1, refillRate: 1 });

      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(bucket.tryConsume(1)).toBe(true);
    });

    it('should handle fractional tokens in capacity', () => {
      const bucket = new TokenBucket({ capacity: 10.5, refillRate: 1 });

      expect(bucket.tryConsume(10.5)).toBe(true);
      expect(bucket.tryConsume(0.1)).toBe(false);
    });

    it('should handle rapid consecutive calls', () => {
      const bucket = new TokenBucket({ capacity: 1000, refillRate: 100 });

      for (let i = 0; i < 1000; i++) {
        expect(bucket.tryConsume(1)).toBe(true);
      }
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should handle time going backwards gracefully', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 5 });

      bucket.tryConsume(10);

      // Advance time
      vi.advanceTimersByTime(1000);
      expect(bucket.getAvailableTokens()).toBe(5);

      // This shouldn't happen in practice, but test graceful handling
      // (Vitest doesn't support going backwards, so we just verify no crash)
      expect(() => bucket.tryConsume(1)).not.toThrow();
    });
  });
});

describe('Semaphore', () => {
  describe('Initialization', () => {
    it('should initialize with max permits', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(false);
    });

    it('should use default max permits', () => {
      const sem = new Semaphore();

      for (let i = 0; i < 10; i++) {
        expect(sem.tryAcquire()).toBe(true);
      }
      expect(sem.tryAcquire()).toBe(false);
    });

    it('should handle zero permits', () => {
      const sem = new Semaphore({ maxPermits: 0 });

      expect(sem.tryAcquire()).toBe(false);
    });

    it('should handle single permit', () => {
      const sem = new Semaphore({ maxPermits: 1 });

      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(false);
    });
  });

  describe('Acquire and Release', () => {
    it('should acquire and release permits', () => {
      const sem = new Semaphore({ maxPermits: 3 });

      const permit1 = sem.tryAcquire();
      const permit2 = sem.tryAcquire();
      const permit3 = sem.tryAcquire();

      expect(permit1).toBe(true);
      expect(permit2).toBe(true);
      expect(permit3).toBe(true);
      expect(sem.tryAcquire()).toBe(false);

      // Release one permit
      sem.release();
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(false);
    });

    it('should handle multiple releases', () => {
      const sem = new Semaphore({ maxPermits: 2 });

      sem.tryAcquire();
      sem.tryAcquire();
      expect(sem.tryAcquire()).toBe(false);

      sem.release();
      sem.release();

      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(false);
    });

    it('should not exceed max permits when releasing', () => {
      const sem = new Semaphore({ maxPermits: 3 });

      // Release without acquiring (should not go above max)
      sem.release();
      sem.release();
      sem.release();

      // Should still only allow 3 acquires
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.tryAcquire()).toBe(false);
    });

    it('should handle acquiring multiple permits', () => {
      const sem = new Semaphore({ maxPermits: 10 });

      expect(sem.tryAcquire(5)).toBe(true);
      expect(sem.tryAcquire(5)).toBe(true);
      expect(sem.tryAcquire(1)).toBe(false);
    });

    it('should reject when requesting more permits than available', () => {
      const sem = new Semaphore({ maxPermits: 10 });

      expect(sem.tryAcquire(5)).toBe(true);  // 5 left
      expect(sem.tryAcquire(6)).toBe(false); // Not enough
      expect(sem.tryAcquire(5)).toBe(true);  // Can acquire remaining 5
    });

    it('should release multiple permits', () => {
      const sem = new Semaphore({ maxPermits: 10 });

      sem.tryAcquire(10);
      expect(sem.tryAcquire(1)).toBe(false);

      sem.release(5);
      expect(sem.tryAcquire(5)).toBe(true);
      expect(sem.tryAcquire(1)).toBe(false);
    });
  });

  describe('getAvailablePermits', () => {
    it('should return current available permits', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      expect(sem.getAvailablePermits()).toBe(5);

      sem.tryAcquire(2);
      expect(sem.getAvailablePermits()).toBe(3);

      sem.release(1);
      expect(sem.getAvailablePermits()).toBe(4);
    });

    it('should not exceed max permits', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      sem.release(10); // Try to release more than acquired
      expect(sem.getAvailablePermits()).toBe(5); // Capped at max
    });
  });

  describe('Real-world Scenarios', () => {
    it('should limit concurrent database connections', () => {
      const connectionPool = new Semaphore({ maxPermits: 10 });

      // Acquire 10 connections
      const connections = [];
      for (let i = 0; i < 10; i++) {
        expect(connectionPool.tryAcquire()).toBe(true);
        connections.push(i);
      }

      // 11th connection should fail
      expect(connectionPool.tryAcquire()).toBe(false);

      // Release 3 connections
      connectionPool.release(3);

      // Can now acquire 3 more
      expect(connectionPool.tryAcquire(3)).toBe(true);
      expect(connectionPool.tryAcquire(1)).toBe(false);
    });

    it('should limit concurrent file handles', () => {
      const fileHandles = new Semaphore({ maxPermits: 5 });

      // Open 5 files
      for (let i = 0; i < 5; i++) {
        expect(fileHandles.tryAcquire()).toBe(true);
      }

      // Cannot open 6th file
      expect(fileHandles.tryAcquire()).toBe(false);

      // Close 1 file
      fileHandles.release();

      // Can open another file
      expect(fileHandles.tryAcquire()).toBe(true);
    });

    it('should limit concurrent LLM calls', () => {
      const llmSemaphore = new Semaphore({ maxPermits: 3 });

      // Start 3 concurrent LLM calls
      expect(llmSemaphore.tryAcquire()).toBe(true);
      expect(llmSemaphore.tryAcquire()).toBe(true);
      expect(llmSemaphore.tryAcquire()).toBe(true);

      // 4th call must wait
      expect(llmSemaphore.tryAcquire()).toBe(false);

      // First call completes
      llmSemaphore.release();

      // 4th call can now proceed
      expect(llmSemaphore.tryAcquire()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero permit requests', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      expect(sem.tryAcquire(0)).toBe(true);
      expect(sem.getAvailablePermits()).toBe(5);
    });

    it('should handle negative permit requests', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      expect(sem.tryAcquire(-1)).toBe(false);
      expect(sem.getAvailablePermits()).toBe(5);
    });

    it('should handle requesting more permits than max', () => {
      const sem = new Semaphore({ maxPermits: 5 });

      expect(sem.tryAcquire(10)).toBe(false);
    });

    it('should handle many acquire/release cycles', () => {
      const sem = new Semaphore({ maxPermits: 10 });

      for (let i = 0; i < 1000; i++) {
        expect(sem.tryAcquire()).toBe(true);
        sem.release();
      }

      expect(sem.getAvailablePermits()).toBe(10);
    });

    it('should handle rapid concurrent-like operations', () => {
      const sem = new Semaphore({ maxPermits: 100 });

      for (let i = 0; i < 100; i++) {
        sem.tryAcquire();
      }

      expect(sem.getAvailablePermits()).toBe(0);

      for (let i = 0; i < 100; i++) {
        sem.release();
      }

      expect(sem.getAvailablePermits()).toBe(100);
    });
  });

  describe('Combined Scenarios', () => {
    it('should work with mixed acquire/release patterns', () => {
      const sem = new Semaphore({ maxPermits: 10 });

      sem.tryAcquire(3);
      sem.tryAcquire(2);
      sem.release(1);
      sem.tryAcquire(4);
      sem.release(2);

      // 3 + 2 - 1 + 4 - 2 = 6 acquired, 4 available
      expect(sem.getAvailablePermits()).toBe(4);
    });
  });
});
