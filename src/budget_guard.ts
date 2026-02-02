export class BudgetGuard {
  private readonly usage = new Map<string, number>();
  private readonly limits = new Map<string, number>();
  private readonly defaultLimit: number;

  constructor(defaultLimit: number = 1.0) {
    this.defaultLimit = defaultLimit;
  }

  check(userId: string, cost: number): boolean {
    // Zero-cost operations are always allowed
    if (cost <= 0) return true;

    const used = this.usage.get(userId) ?? 0;
    const limit = this.limits.get(userId) ?? this.defaultLimit;
    return used + cost <= limit;
  }

  deduct(userId: string, cost: number): void {
    const used = this.usage.get(userId) ?? 0;
    this.usage.set(userId, used + cost);
  }

  setLimit(userId: string, limit: number): void {
    this.limits.set(userId, limit);
  }

  getUsage(userId: string): number {
    return this.usage.get(userId) ?? 0;
  }

  getLimit(userId: string): number {
    return this.limits.get(userId) ?? this.defaultLimit;
  }

  getRemaining(userId: string): number {
    const used = this.usage.get(userId) ?? 0;
    const limit = this.limits.get(userId) ?? this.defaultLimit;
    return limit - used;
  }

  reset(userId: string): void {
    this.usage.delete(userId);
  }

  resetAll(): void {
    this.usage.clear();
  }
}
