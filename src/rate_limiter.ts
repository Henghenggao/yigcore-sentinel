/**
 * Rate limiting primitives for governance.
 *
 * - TokenBucket: for token-based rate limiting
 * - Semaphore: for concurrency-based limiting
 */

export interface RateLimiterAcquireOptions {
  priority?: number;
  taskId?: string;
  signal?: AbortSignal;
}

export interface RateLimiter {
  /** Try to consume tokens/permits. Returns true if allowed, false if rate limited. */
  tryConsume(tokens?: number): boolean;
  /** Get current stats. */
  stats(): { available: number; waiting: number };
}

// ---------------------------------------------------------------------------
// Token Bucket — for rate limiting
// ---------------------------------------------------------------------------

export interface TokenBucketOptions {
  /** Max tokens in the bucket (burst capacity). */
  capacity?: number;
  /** Tokens added per second (sustained rate). */
  refillRate?: number;
}

export class TokenBucket implements RateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private lastRefillAt: number;

  constructor(options: TokenBucketOptions = {}) {
    this.capacity = options.capacity ?? 100;
    this.refillRate = options.refillRate ?? 10;
    this.tokens = this.capacity;
    this.lastRefillAt = Date.now();
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (tokens < 0) return false;
    if (tokens === 0) return true;

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  stats(): { available: number; waiting: number } {
    this.refill();
    return { available: Math.floor(this.tokens), waiting: 0 };
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillAt) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefillAt = now;
  }
}

// ---------------------------------------------------------------------------
// Semaphore — for concurrency limiting
// ---------------------------------------------------------------------------

export interface SemaphoreOptions {
  /** Maximum concurrent permits. */
  maxPermits?: number;
  /** Alias for maxPermits (deprecated, use maxPermits instead) */
  maxConcurrency?: number;
}

export class Semaphore implements RateLimiter {
  private permits: number;
  private readonly maxPermits: number;

  constructor(options: SemaphoreOptions = {}) {
    // Support both maxPermits and maxConcurrency (backwards compatibility)
    this.maxPermits = options.maxPermits ?? options.maxConcurrency ?? 10;
    this.permits = this.maxPermits;
  }

  tryConsume(permits: number = 1): boolean {
    if (permits < 0) return false;
    if (permits === 0) return true;

    if (this.permits >= permits) {
      this.permits -= permits;
      return true;
    }
    return false;
  }

  /** Alias for tryConsume (for better semantics) */
  tryAcquire(permits: number = 1): boolean {
    return this.tryConsume(permits);
  }

  release(permits: number = 1): void {
    this.permits = Math.min(this.maxPermits, this.permits + permits);
  }

  getAvailablePermits(): number {
    return this.permits;
  }

  stats(): { available: number; waiting: number } {
    return {
      available: this.permits,
      waiting: 0,
    };
  }
}
