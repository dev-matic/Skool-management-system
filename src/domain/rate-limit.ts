/**
 * Counts failed attempts per key (e.g. per IP address or per account) within
 * a time window, to slow down password guessing. In memory: suitable for a
 * single server process, which is how we deploy.
 */
export class FailureLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** True when the key has reached the limit and must wait. */
  isBlocked(key: string): boolean {
    return this.recent(key).length >= this.maxFailures;
  }

  /** Milliseconds until the key may try again (0 if not blocked). */
  retryAfterMs(key: string): number {
    const recent = this.recent(key);
    if (recent.length < this.maxFailures) return 0;
    const oldestCounted = recent[recent.length - this.maxFailures]!;
    return Math.max(0, oldestCounted + this.windowMs - this.now());
  }

  recordFailure(key: string): void {
    const recent = this.recent(key);
    recent.push(this.now());
    this.failures.set(key, recent);
    this.prune();
  }

  /** A successful sign-in clears the account's failures. */
  reset(key: string): void {
    this.failures.delete(key);
  }

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    return (this.failures.get(key) ?? []).filter((t) => t > cutoff);
  }

  /** Keeps memory bounded by dropping keys with no recent failures. */
  private prune(): void {
    if (this.failures.size < 10_000) return;
    for (const key of [...this.failures.keys()]) {
      if (this.recent(key).length === 0) this.failures.delete(key);
    }
  }
}
