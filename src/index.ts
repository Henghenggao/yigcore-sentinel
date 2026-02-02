/**
 * Yigcore Sentinel - Main entry point
 *
 * Export all governance components for programmatic use.
 */

export { BudgetGuard } from './budget_guard';
export {
  StructuredAuditLogger,
  nullAuditLogger,
  type AuditLogEntry,
} from './audit_logger';
export {
  TokenBucket,
  type TokenBucketOptions,
} from './rate_limiter';
export {
  PolicyEngine,
  createDefaultPolicy,
  type PolicyRule,
  type PolicyConfig,
  type PolicyDecision,
} from './policy_lite';

export const version = '0.3.0';
