// ============================================================================
// Sentinel API Client
// ============================================================================

import type { AuditLogEntry, UserStats, HealthStatus } from '../types';

const BASE_URL = import.meta.env.VITE_SENTINEL_URL || '';

class SentinelAPI {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getHealth(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getAuditLogs(params?: {
    userId?: string;
    limit?: number;
  }): Promise<{ logs: AuditLogEntry[] }> {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', params.limit.toString());

    const url = `${this.baseUrl}/governance/audit${query.toString() ? `?${query}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const response = await fetch(
      `${this.baseUrl}/governance/stats?userId=${encodeURIComponent(userId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user stats: ${response.statusText}`);
    }

    return response.json();
  }

  async setBudget(userId: string, limit: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/governance/budget/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, limit }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set budget: ${response.statusText}`);
    }
  }

  async resetBudget(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/governance/budget/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to reset budget: ${response.statusText}`);
    }
  }
}

export const sentinelAPI = new SentinelAPI();
