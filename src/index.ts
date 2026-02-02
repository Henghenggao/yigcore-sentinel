/**
 * Yigcore Sentinel - Main entry point
 *
 * Export all governance components for programmatic use.
 */

export { BudgetGuard } from './budget_guard';
export {
  StructuredAuditLogger,
  nullAuditLogger,
  type AuditEvent,
  type InferenceAuditEntry,
  type GovernanceAuditEntry,
  type StructuredAuditEntry,
  type AuditSink,
} from './audit_logger';
export {
  TokenBucket,
  Semaphore,
  type RateLimiter,
  type TokenBucketOptions,
  type SemaphoreOptions,
} from './rate_limiter';
export {
  PolicyEngine,
  createDefaultPolicy,
  type PolicyRule,
  type PolicyConfig,
  type PolicyDecision,
} from './policy_lite';

export const version = '0.2.0';
