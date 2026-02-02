/**
 * Unit tests for PolicyEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine, createDefaultPolicy, type PolicyConfig } from '../policy_lite';

describe('PolicyEngine', () => {
  describe('Basic Rule Matching', () => {
    it('should apply default effect when no rules match', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [],
      };
      const engine = new PolicyEngine(config);

      const decision = engine.evaluate('some_action');
      expect(decision.effect).toBe('allow');
      expect(decision.matchedRule).toBeUndefined();
    });

    it('should match exact action names', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_delete',
            action: 'delete_file',
            effect: 'deny',
            reason: 'File deletion is not allowed',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      const decision = engine.evaluate('delete_file');
      expect(decision.effect).toBe('deny');
      expect(decision.matchedRule?.id).toBe('block_delete');
      expect(decision.reason).toBe('File deletion is not allowed');
    });

    it('should not match different action names', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_delete',
            action: 'delete_file',
            effect: 'deny',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      const decision = engine.evaluate('read_file');
      expect(decision.effect).toBe('allow');
      expect(decision.matchedRule).toBeUndefined();
    });
  });

  describe('Wildcard Matching', () => {
    it('should match wildcard prefix (delete_*)', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_all_deletes',
            action: 'delete_*',
            effect: 'deny',
            reason: 'All delete operations are blocked',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('delete_file').effect).toBe('deny');
      expect(engine.evaluate('delete_directory').effect).toBe('deny');
      expect(engine.evaluate('delete_user').effect).toBe('deny');
      expect(engine.evaluate('create_file').effect).toBe('allow');
    });

    it('should match wildcard suffix (*_file)', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_file_ops',
            action: '*_file',
            effect: 'deny',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('delete_file').effect).toBe('deny');
      expect(engine.evaluate('read_file').effect).toBe('deny');
      expect(engine.evaluate('write_file').effect).toBe('deny');
      expect(engine.evaluate('delete_directory').effect).toBe('allow');
    });

    it('should match full wildcard (*)', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'log_everything',
            action: '*',
            effect: 'warn',
            reason: 'All actions are logged',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('any_action').effect).toBe('warn');
      expect(engine.evaluate('delete_file').effect).toBe('warn');
    });
  });

  describe('Condition Matching', () => {
    it('should match pathPattern condition', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'protect_etc',
            action: 'delete_file',
            effect: 'deny',
            conditions: {
              pathPattern: '/etc/*',
            },
            reason: 'System files are protected',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // Should block /etc/* paths
      expect(engine.evaluate('delete_file', { path: '/etc/passwd' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/etc/hosts' }).effect).toBe('deny');

      // Should allow other paths
      expect(engine.evaluate('delete_file', { path: '/tmp/test.txt' }).effect).toBe('allow');
      expect(engine.evaluate('delete_file', { path: '/home/user/file.txt' }).effect).toBe('allow');
    });

    it('should match multiple path patterns', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'protect_system',
            action: 'delete_file',
            effect: 'deny',
            conditions: {
              pathPattern: '/etc/*',
            },
          },
          {
            id: 'protect_sys',
            action: 'delete_file',
            effect: 'deny',
            conditions: {
              pathPattern: '/sys/*',
            },
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('delete_file', { path: '/etc/passwd' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/sys/kernel' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/tmp/test.txt' }).effect).toBe('allow');
    });

    it('should match userPattern condition', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'restrict_dev_users',
            action: 'database_write',
            effect: 'deny',
            conditions: {
              userPattern: 'dev_*',
            },
            reason: 'Dev users cannot write to database',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('database_write', { userId: 'dev_alice' }).effect).toBe('deny');
      expect(engine.evaluate('database_write', { userId: 'dev_bob' }).effect).toBe('deny');
      expect(engine.evaluate('database_write', { userId: 'prod_alice' }).effect).toBe('allow');
    });

    it('should match maxCost condition', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'limit_expensive_calls',
            action: 'llm_call',
            effect: 'warn',
            conditions: {
              maxCost: 0.1,
            },
            reason: 'Expensive LLM calls are flagged',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // Cost below limit - no match
      expect(engine.evaluate('llm_call', { cost: 0.05 }).effect).toBe('allow');

      // Cost above limit - should warn
      expect(engine.evaluate('llm_call', { cost: 0.15 }).effect).toBe('warn');
      expect(engine.evaluate('llm_call', { cost: 0.2 }).effect).toBe('warn');
    });

    it('should match multiple conditions (AND logic)', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'restrict_dev_prod_db',
            action: 'database_write',
            effect: 'deny',
            conditions: {
              userPattern: 'dev_*',
              pathPattern: '/prod/*',
            },
            reason: 'Dev users cannot write to production DB',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // Both conditions match - deny
      expect(engine.evaluate('database_write', {
        userId: 'dev_alice',
        path: '/prod/db'
      }).effect).toBe('deny');

      // Only one condition matches - allow (default)
      expect(engine.evaluate('database_write', {
        userId: 'dev_alice',
        path: '/dev/db'
      }).effect).toBe('allow');

      expect(engine.evaluate('database_write', {
        userId: 'prod_alice',
        path: '/prod/db'
      }).effect).toBe('allow');
    });
  });

  describe('Rule Priority', () => {
    it('should apply first matching rule', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_all',
            action: '*',
            effect: 'deny',
            reason: 'First rule blocks everything',
          },
          {
            id: 'allow_read',
            action: 'read_*',
            effect: 'allow',
            reason: 'This should never be reached',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      const decision = engine.evaluate('read_file');
      expect(decision.effect).toBe('deny');
      expect(decision.matchedRule?.id).toBe('block_all');
    });

    it('should respect rule order for priority', () => {
      const config: PolicyConfig = {
        defaultEffect: 'deny',
        rules: [
          {
            id: 'allow_safe_deletes',
            action: 'delete_file',
            effect: 'allow',
            conditions: {
              pathPattern: '/tmp/*',
            },
          },
          {
            id: 'block_all_deletes',
            action: 'delete_file',
            effect: 'deny',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // First rule matches - allow
      expect(engine.evaluate('delete_file', { path: '/tmp/test.txt' }).effect).toBe('allow');

      // First rule doesn't match, second rule matches - deny
      expect(engine.evaluate('delete_file', { path: '/home/file.txt' }).effect).toBe('deny');
    });
  });

  describe('Effect Types', () => {
    it('should support allow effect', () => {
      const config: PolicyConfig = {
        defaultEffect: 'deny',
        rules: [
          {
            id: 'allow_read',
            action: 'read_file',
            effect: 'allow',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('read_file').effect).toBe('allow');
      expect(engine.evaluate('write_file').effect).toBe('deny');
    });

    it('should support deny effect', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'deny_write',
            action: 'write_file',
            effect: 'deny',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('write_file').effect).toBe('deny');
      expect(engine.evaluate('read_file').effect).toBe('allow');
    });

    it('should support warn effect', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'warn_shell',
            action: 'execute_shell',
            effect: 'warn',
            reason: 'Shell execution is audited',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      const decision = engine.evaluate('execute_shell');
      expect(decision.effect).toBe('warn');
      expect(decision.reason).toBe('Shell execution is audited');
    });
  });

  describe('createDefaultPolicy', () => {
    it('should create a valid default policy', () => {
      const policy = createDefaultPolicy();

      expect(policy.defaultEffect).toBe('allow');
      expect(Array.isArray(policy.rules)).toBe(true);
      expect(policy.rules.length).toBeGreaterThan(0);
    });

    it('should block system file deletion by default', () => {
      const policy = createDefaultPolicy();
      const engine = new PolicyEngine(policy);

      expect(engine.evaluate('delete_file', { path: '/etc/passwd' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/sys/kernel' }).effect).toBe('deny');
    });

    it('should warn on shell execution by default', () => {
      const policy = createDefaultPolicy();
      const engine = new PolicyEngine(policy);

      expect(engine.evaluate('execute_shell').effect).toBe('warn');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing context gracefully', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'check_path',
            action: 'delete_file',
            effect: 'deny',
            conditions: {
              pathPattern: '/etc/*',
            },
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // No context provided - should not match rule
      expect(engine.evaluate('delete_file').effect).toBe('allow');

      // Empty context - should not match rule
      expect(engine.evaluate('delete_file', {}).effect).toBe('allow');
    });

    it('should handle empty rules array', () => {
      const config: PolicyConfig = {
        defaultEffect: 'deny',
        rules: [],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('any_action').effect).toBe('deny');
    });

    it('should handle rule without conditions', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_all',
            action: 'dangerous_action',
            effect: 'deny',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('dangerous_action').effect).toBe('deny');
      expect(engine.evaluate('dangerous_action', { foo: 'bar' }).effect).toBe('deny');
    });

    it('should handle special characters in patterns', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'match_special',
            action: 'delete_file',
            effect: 'deny',
            conditions: {
              pathPattern: '/var/log/*.log',
            },
          },
        ],
      };
      const engine = new PolicyEngine(config);

      expect(engine.evaluate('delete_file', { path: '/var/log/app.log' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/var/log/system.log' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/var/log/test.txt' }).effect).toBe('allow');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle OpenClaw file operation policy', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'block_etc',
            action: 'delete_file',
            effect: 'deny',
            conditions: { pathPattern: '/etc/*' },
            reason: 'System files in /etc are protected',
          },
          {
            id: 'block_sys',
            action: 'delete_file',
            effect: 'deny',
            conditions: { pathPattern: '/sys/*' },
            reason: 'System files in /sys are protected',
          },
          {
            id: 'warn_shell',
            action: 'execute_shell',
            effect: 'warn',
            reason: 'Shell command execution is logged for audit purposes',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // Should block system files
      expect(engine.evaluate('delete_file', { path: '/etc/passwd' }).effect).toBe('deny');
      expect(engine.evaluate('delete_file', { path: '/sys/kernel/debug' }).effect).toBe('deny');

      // Should allow temp files
      expect(engine.evaluate('delete_file', { path: '/tmp/test.txt' }).effect).toBe('allow');

      // Should warn on shell commands
      expect(engine.evaluate('execute_shell', { command: 'ls -la' }).effect).toBe('warn');
    });

    it('should handle multi-environment policy', () => {
      const config: PolicyConfig = {
        defaultEffect: 'allow',
        rules: [
          {
            id: 'dev_no_prod_write',
            action: 'database_write',
            effect: 'deny',
            conditions: {
              userPattern: 'dev_*',
              pathPattern: '/prod/*',
            },
            reason: 'Dev users cannot write to production',
          },
          {
            id: 'expensive_llm_warn',
            action: 'llm_call',
            effect: 'warn',
            conditions: {
              maxCost: 0.1,
            },
            reason: 'Expensive LLM call detected',
          },
        ],
      };
      const engine = new PolicyEngine(config);

      // Dev user + prod DB = deny
      expect(engine.evaluate('database_write', {
        userId: 'dev_alice',
        path: '/prod/users'
      }).effect).toBe('deny');

      // Dev user + dev DB = allow
      expect(engine.evaluate('database_write', {
        userId: 'dev_alice',
        path: '/dev/users'
      }).effect).toBe('allow');

      // Expensive LLM call = warn
      expect(engine.evaluate('llm_call', { cost: 0.5 }).effect).toBe('warn');

      // Cheap LLM call = allow
      expect(engine.evaluate('llm_call', { cost: 0.01 }).effect).toBe('allow');
    });
  });
});
