/**
 * Policy Engine (Lite) - Rule-based governance for AI agents.
 *
 * Provides a simple but powerful policy system based on rules that can:
 * - Allow, deny, or warn about specific actions
 * - Match actions by pattern (supports wildcards)
 * - Apply conditions (path patterns, cost limits, etc.)
 */

export interface PolicyRule {
  id: string;
  action: string;              // e.g., "delete_file", "execute_shell", "llm_call"
  effect: 'allow' | 'deny' | 'warn';
  conditions?: {
    pathPattern?: string;      // e.g., "/tmp/*" allows, "/etc/*" denies
    maxCost?: number;          // Single operation cost limit
    userPattern?: string;      // User ID pattern
    timeWindow?: {             // Time-based restrictions
      start: string;           // HH:MM format
      end: string;             // HH:MM format
    };
  };
  reason?: string;             // Human-readable explanation
}

export interface PolicyConfig {
  defaultEffect: 'allow' | 'deny';
  rules: PolicyRule[];
}

export interface PolicyDecision {
  effect: 'allow' | 'deny' | 'warn';
  matchedRule?: PolicyRule;
  reason?: string;
}

export class PolicyEngine {
  constructor(private config: PolicyConfig) {}

  evaluate(action: string, context: Record<string, any> = {}): PolicyDecision {
    // Iterate through rules in order
    for (const rule of this.config.rules) {
      if (this.matchAction(rule.action, action) && this.matchConditions(rule.conditions, context)) {
        return {
          effect: rule.effect,
          matchedRule: rule,
          reason: rule.reason || `Matched rule: ${rule.id}`,
        };
      }
    }

    // No rule matched, use default
    return {
      effect: this.config.defaultEffect,
      reason: 'No rule matched, using default policy',
    };
  }

  private matchAction(pattern: string, action: string): boolean {
    // Support wildcards: "delete_*" matches "delete_file", "delete_directory"
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(action);
  }

  private matchConditions(conditions: PolicyRule['conditions'], context: Record<string, any>): boolean {
    if (!conditions) return true;

    // Path pattern matching
    if (conditions.pathPattern !== undefined) {
      // If pattern is specified but path is missing, condition doesn't match
      if (context.path === undefined) return false;
      const regex = new RegExp('^' + conditions.pathPattern.replace(/\*/g, '.*') + '$');
      if (!regex.test(context.path)) return false;
    }

    // Cost limit - triggers when cost EXCEEDS the limit
    if (conditions.maxCost !== undefined) {
      // If maxCost is specified but cost is missing, condition doesn't match
      if (context.cost === undefined) return false;
      if (context.cost <= conditions.maxCost) return false;
    }

    // User pattern matching
    if (conditions.userPattern !== undefined) {
      // If pattern is specified but userId is missing, condition doesn't match
      if (context.userId === undefined) return false;
      const regex = new RegExp('^' + conditions.userPattern.replace(/\*/g, '.*') + '$');
      if (!regex.test(context.userId)) return false;
    }

    // Time window check
    if (conditions.timeWindow) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { start, end } = conditions.timeWindow;

      if (start <= end) {
        // Normal range: 09:00 - 17:00
        if (currentTime < start || currentTime > end) return false;
      } else {
        // Overnight range: 22:00 - 06:00
        if (currentTime < start && currentTime > end) return false;
      }
    }

    return true;
  }

  /** Update policy configuration at runtime */
  updatePolicy(config: PolicyConfig): void {
    this.config = config;
  }

  /** Add a new rule */
  addRule(rule: PolicyRule): void {
    this.config.rules.push(rule);
  }

  /** Remove a rule by ID */
  removeRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter(r => r.id !== ruleId);
  }

  /** Get current policy configuration */
  getPolicy(): PolicyConfig {
    return { ...this.config, rules: [...this.config.rules] };
  }
}

/**
 * Create a default policy configuration for common use cases
 */
export function createDefaultPolicy(): PolicyConfig {
  return {
    defaultEffect: 'allow',
    rules: [
      {
        id: 'block_system_files',
        action: 'delete_file',
        effect: 'deny',
        conditions: { pathPattern: '/etc/*' },
        reason: 'System files are protected',
      },
      {
        id: 'block_root_files',
        action: 'delete_file',
        effect: 'deny',
        conditions: { pathPattern: '/sys/*' },
        reason: 'System files are protected',
      },
      {
        id: 'warn_shell_execution',
        action: 'execute_shell',
        effect: 'warn',
        reason: 'Shell execution is logged for audit',
      },
      {
        id: 'limit_expensive_llm_calls',
        action: 'llm_call',
        effect: 'allow',
        conditions: { maxCost: 0.1 },
        reason: 'LLM calls above $0.10 require review',
      },
    ],
  };
}
