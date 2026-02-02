// ============================================================================
// Sentinel Dashboard Types
// ============================================================================

export interface AuditLogEntry {
  type: 'governance_allow' | 'governance_block' | 'governance_warning' | 'inference';
  timestamp: number;
  agentId: string;
  action: string;
  reason?: string;
  details?: Record<string, any>;
}

export interface BudgetStats {
  used: number;
  limit: number;
  remaining: number;
}

export interface RateLimitStats {
  available: number;
  capacity: number;
  refillRate: number;
}

export interface UserStats {
  userId: string;
  budget: BudgetStats;
  rateLimit: RateLimitStats;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: number;
  version: string;
}

export interface PolicyRule {
  id: string;
  action: string;
  effect: 'allow' | 'deny' | 'warn';
  conditions?: {
    pathPattern?: string;
    maxCost?: number;
    userPattern?: string;
    timeWindow?: string;
  };
  reason?: string;
}

export interface PolicyConfig {
  defaultEffect: 'allow' | 'deny';
  rules: PolicyRule[];
}

export interface DashboardState {
  health: HealthStatus | null;
  auditLogs: AuditLogEntry[];
  userStats: Map<string, UserStats>;
  selectedUser: string | null;
  autoRefresh: boolean;
  refreshInterval: number; // ms
}
