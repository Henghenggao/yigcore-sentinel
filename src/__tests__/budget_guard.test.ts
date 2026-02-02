/**
 * Unit tests for BudgetGuard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetGuard } from '../budget_guard';

describe('BudgetGuard', () => {
  let budgetGuard: BudgetGuard;

  beforeEach(() => {
    budgetGuard = new BudgetGuard(10.0); // $10 default budget
  });

  describe('Initialization', () => {
    it('should initialize with default budget', () => {
      const guard = new BudgetGuard(5.0);
      expect(guard.check('user1', 3.0)).toBe(true);
      expect(guard.check('user1', 6.0)).toBe(false);
    });

    it('should handle zero budget', () => {
      const guard = new BudgetGuard(0.0);
      expect(guard.check('user1', 0.01)).toBe(false);
    });

    it('should handle large budgets', () => {
      const guard = new BudgetGuard(1000000.0);
      expect(guard.check('user1', 500000.0)).toBe(true);
    });
  });

  describe('Budget Checking', () => {
    it('should allow spending within budget', () => {
      expect(budgetGuard.check('user1', 5.0)).toBe(true);
      expect(budgetGuard.check('user1', 10.0)).toBe(true);
    });

    it('should block spending over budget', () => {
      expect(budgetGuard.check('user1', 10.01)).toBe(false);
      expect(budgetGuard.check('user1', 15.0)).toBe(false);
    });

    it('should check against remaining budget after deductions', () => {
      budgetGuard.deduct('user1', 6.0);

      expect(budgetGuard.check('user1', 4.0)).toBe(true);  // 6 + 4 = 10 (at limit)
      expect(budgetGuard.check('user1', 4.01)).toBe(false); // 6 + 4.01 = 10.01 (over)
    });

    it('should handle fractional amounts correctly', () => {
      budgetGuard.deduct('user1', 0.001);
      budgetGuard.deduct('user1', 0.002);

      expect(budgetGuard.check('user1', 9.997)).toBe(true);
      expect(budgetGuard.check('user1', 9.998)).toBe(false);
    });

    it('should handle zero cost checks', () => {
      expect(budgetGuard.check('user1', 0.0)).toBe(true);

      budgetGuard.deduct('user1', 10.0);
      expect(budgetGuard.check('user1', 0.0)).toBe(true); // Zero cost always allowed
    });

    it('should handle negative cost checks', () => {
      // Negative costs should be treated as zero (allowed)
      expect(budgetGuard.check('user1', -5.0)).toBe(true);
    });
  });

  describe('Budget Deduction', () => {
    it('should deduct cost from budget', () => {
      budgetGuard.deduct('user1', 3.0);

      expect(budgetGuard.getUsage('user1')).toBe(3.0);
      expect(budgetGuard.check('user1', 7.0)).toBe(true);
      expect(budgetGuard.check('user1', 7.01)).toBe(false);
    });

    it('should allow multiple deductions', () => {
      budgetGuard.deduct('user1', 2.0);
      budgetGuard.deduct('user1', 3.0);
      budgetGuard.deduct('user1', 1.5);

      expect(budgetGuard.getUsage('user1')).toBe(6.5);
    });

    it('should allow deduction even when over budget', () => {
      // This allows recording actual usage even if it exceeds budget
      budgetGuard.deduct('user1', 8.0);
      budgetGuard.deduct('user1', 5.0); // Total: 13.0 (over budget)

      expect(budgetGuard.getUsage('user1')).toBe(13.0);
      expect(budgetGuard.check('user1', 0.0)).toBe(true); // Zero cost still allowed
    });

    it('should handle zero cost deductions', () => {
      budgetGuard.deduct('user1', 0.0);
      expect(budgetGuard.getUsage('user1')).toBe(0.0);
    });

    it('should handle fractional deductions', () => {
      budgetGuard.deduct('user1', 0.001);
      budgetGuard.deduct('user1', 0.002);
      budgetGuard.deduct('user1', 0.003);

      expect(budgetGuard.getUsage('user1')).toBe(0.006);
    });
  });

  describe('Multi-user Support', () => {
    it('should track budgets independently for different users', () => {
      budgetGuard.deduct('user1', 5.0);
      budgetGuard.deduct('user2', 8.0);

      expect(budgetGuard.getUsage('user1')).toBe(5.0);
      expect(budgetGuard.getUsage('user2')).toBe(8.0);

      expect(budgetGuard.check('user1', 5.0)).toBe(true);
      expect(budgetGuard.check('user2', 2.0)).toBe(true);
      expect(budgetGuard.check('user2', 2.01)).toBe(false);
    });

    it('should handle many users', () => {
      for (let i = 0; i < 100; i++) {
        budgetGuard.deduct(`user${i}`, i * 0.1);
      }

      expect(budgetGuard.getUsage('user0')).toBe(0.0);
      expect(budgetGuard.getUsage('user10')).toBe(1.0);
      expect(budgetGuard.getUsage('user50')).toBe(5.0);
    });

    it('should not affect other users when one exceeds budget', () => {
      budgetGuard.deduct('user1', 15.0); // Over budget

      expect(budgetGuard.check('user1', 1.0)).toBe(false);
      expect(budgetGuard.check('user2', 10.0)).toBe(true); // user2 unaffected
    });
  });

  describe('Per-user Budget Limits', () => {
    it('should allow setting custom budget for specific user', () => {
      budgetGuard.setLimit('premium_user', 50.0);

      expect(budgetGuard.check('premium_user', 40.0)).toBe(true);
      expect(budgetGuard.check('premium_user', 50.0)).toBe(true);
      expect(budgetGuard.check('premium_user', 50.01)).toBe(false);
    });

    it('should use default budget for users without custom limit', () => {
      budgetGuard.setLimit('premium_user', 50.0);

      expect(budgetGuard.check('regular_user', 10.0)).toBe(true);
      expect(budgetGuard.check('regular_user', 10.01)).toBe(false);
    });

    it('should allow updating user budget limit', () => {
      budgetGuard.setLimit('user1', 20.0);
      budgetGuard.deduct('user1', 15.0);

      expect(budgetGuard.check('user1', 5.0)).toBe(true);
      expect(budgetGuard.check('user1', 5.01)).toBe(false);

      // Update to lower limit
      budgetGuard.setLimit('user1', 18.0);
      expect(budgetGuard.check('user1', 3.0)).toBe(true);
      expect(budgetGuard.check('user1', 3.01)).toBe(false);
    });

    it('should handle setting limit to zero', () => {
      budgetGuard.setLimit('restricted_user', 0.0);

      expect(budgetGuard.check('restricted_user', 0.0)).toBe(true);
      expect(budgetGuard.check('restricted_user', 0.01)).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    it('should return zero usage for new user', () => {
      expect(budgetGuard.getUsage('new_user')).toBe(0.0);
    });

    it('should return current usage', () => {
      budgetGuard.deduct('user1', 3.5);
      expect(budgetGuard.getUsage('user1')).toBe(3.5);
    });

    it('should return cumulative usage', () => {
      budgetGuard.deduct('user1', 1.0);
      budgetGuard.deduct('user1', 2.0);
      budgetGuard.deduct('user1', 3.0);

      expect(budgetGuard.getUsage('user1')).toBe(6.0);
    });

    it('should get limit for user', () => {
      expect(budgetGuard.getLimit('user1')).toBe(10.0);

      budgetGuard.setLimit('user1', 25.0);
      expect(budgetGuard.getLimit('user1')).toBe(25.0);
    });

    it('should get remaining budget', () => {
      budgetGuard.deduct('user1', 3.0);

      expect(budgetGuard.getRemaining('user1')).toBe(7.0);
    });

    it('should return negative remaining when over budget', () => {
      budgetGuard.deduct('user1', 12.0);

      expect(budgetGuard.getRemaining('user1')).toBe(-2.0);
    });
  });

  describe('Budget Reset', () => {
    it('should reset user budget to zero', () => {
      budgetGuard.deduct('user1', 5.0);
      budgetGuard.reset('user1');

      expect(budgetGuard.getUsage('user1')).toBe(0.0);
      expect(budgetGuard.check('user1', 10.0)).toBe(true);
    });

    it('should only reset specified user', () => {
      budgetGuard.deduct('user1', 5.0);
      budgetGuard.deduct('user2', 7.0);

      budgetGuard.reset('user1');

      expect(budgetGuard.getUsage('user1')).toBe(0.0);
      expect(budgetGuard.getUsage('user2')).toBe(7.0);
    });

    it('should reset budget but keep custom limit', () => {
      budgetGuard.setLimit('user1', 20.0);
      budgetGuard.deduct('user1', 15.0);

      budgetGuard.reset('user1');

      expect(budgetGuard.getUsage('user1')).toBe(0.0);
      expect(budgetGuard.getLimit('user1')).toBe(20.0);
    });

    it('should handle resetting non-existent user', () => {
      expect(() => budgetGuard.reset('non_existent_user')).not.toThrow();
      expect(budgetGuard.getUsage('non_existent_user')).toBe(0.0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical LLM usage tracking', () => {
      const llmGuard = new BudgetGuard(10.0);

      // Simulate 50 LLM calls at $0.002 each
      for (let i = 0; i < 50; i++) {
        expect(llmGuard.check('agent1', 0.002)).toBe(true);
        llmGuard.deduct('agent1', 0.002);
      }

      expect(llmGuard.getUsage('agent1')).toBeCloseTo(0.1, 10);
      expect(llmGuard.getRemaining('agent1')).toBeCloseTo(9.9, 10);
    });

    it('should block when budget is exhausted', () => {
      const guard = new BudgetGuard(1.0);

      // Make calls until budget exhausted
      let callCount = 0;
      for (let i = 0; i < 1000; i++) {
        if (guard.check('user1', 0.002)) {
          guard.deduct('user1', 0.002);
          callCount++;
        } else {
          break;
        }
      }

      // Should have made approximately 500 calls (500 * 0.002 = 1.0)
      // Allow for floating-point precision issues (499-500 calls)
      expect(callCount).toBeGreaterThanOrEqual(499);
      expect(callCount).toBeLessThanOrEqual(500);
      expect(guard.getUsage('user1')).toBeCloseTo(1.0, 2);

      // Verify budget is near exhaustion (can't consume significantly more)
      expect(guard.check('user1', 0.01)).toBe(false);
    });

    it('should handle mixed cost operations', () => {
      budgetGuard.deduct('agent1', 0.002);  // Small LLM call
      budgetGuard.deduct('agent1', 0.05);   // Medium LLM call
      budgetGuard.deduct('agent1', 0.5);    // Large LLM call
      budgetGuard.deduct('agent1', 0.0);    // Free operation (file read)

      expect(budgetGuard.getUsage('agent1')).toBeCloseTo(0.552, 10);
      expect(budgetGuard.check('agent1', 9.448)).toBe(true);
      expect(budgetGuard.check('agent1', 9.449)).toBe(false);
    });

    it('should support tiered pricing for different users', () => {
      budgetGuard.setLimit('free_tier', 1.0);
      budgetGuard.setLimit('pro_tier', 10.0);
      budgetGuard.setLimit('enterprise_tier', 100.0);

      budgetGuard.deduct('free_tier', 0.8);
      budgetGuard.deduct('pro_tier', 8.0);
      budgetGuard.deduct('enterprise_tier', 80.0);

      expect(budgetGuard.check('free_tier', 0.2)).toBe(true);
      expect(budgetGuard.check('free_tier', 0.21)).toBe(false);

      expect(budgetGuard.check('pro_tier', 2.0)).toBe(true);
      expect(budgetGuard.check('pro_tier', 2.01)).toBe(false);

      expect(budgetGuard.check('enterprise_tier', 20.0)).toBe(true);
      expect(budgetGuard.check('enterprise_tier', 20.01)).toBe(false);
    });

    it('should handle budget refill scenario', () => {
      // Use up budget
      budgetGuard.deduct('user1', 10.0);
      expect(budgetGuard.check('user1', 0.01)).toBe(false);

      // Refill by resetting
      budgetGuard.reset('user1');
      expect(budgetGuard.check('user1', 10.0)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small costs', () => {
      budgetGuard.deduct('user1', 0.0000001);
      expect(budgetGuard.getUsage('user1')).toBeCloseTo(0.0000001, 10);
    });

    it('should handle very large costs', () => {
      budgetGuard.deduct('user1', 999999.99);
      expect(budgetGuard.getUsage('user1')).toBe(999999.99);
    });

    it('should handle rapid consecutive checks', () => {
      for (let i = 0; i < 1000; i++) {
        expect(budgetGuard.check('user1', 0.01)).toBe(true);
      }
    });

    it('should handle rapid consecutive deductions', () => {
      for (let i = 0; i < 100; i++) {
        budgetGuard.deduct('user1', 0.01);
      }
      expect(budgetGuard.getUsage('user1')).toBeCloseTo(1.0, 10);
    });

    it('should handle special characters in user IDs', () => {
      const specialUserId = 'user@email.com';
      budgetGuard.deduct(specialUserId, 5.0);
      expect(budgetGuard.getUsage(specialUserId)).toBe(5.0);
    });

    it('should handle empty string user ID', () => {
      budgetGuard.deduct('', 5.0);
      expect(budgetGuard.getUsage('')).toBe(5.0);
    });
  });

  describe('Thread Safety Considerations', () => {
    it('should handle concurrent-like operations', () => {
      // Simulate concurrent deductions
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(() => budgetGuard.deduct('user1', 0.01));
      }

      operations.forEach(op => op());

      expect(budgetGuard.getUsage('user1')).toBeCloseTo(1.0, 10);
    });
  });
});
