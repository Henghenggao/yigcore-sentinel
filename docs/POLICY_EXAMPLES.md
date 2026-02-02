# Policy Examples

Real-world policy configurations for common use cases.

## Table of Contents

- [Basic Policies](#basic-policies)
- [Multi-Environment Policies](#multi-environment-policies)
- [Cost Control Policies](#cost-control-policies)
- [Security Policies](#security-policies)
- [Operational Policies](#operational-policies)
- [Complex Scenarios](#complex-scenarios)

---

## Basic Policies

### 1. Protect System Files

Block deletion of critical system directories.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_etc",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/etc/*"
      },
      "reason": "System configuration files in /etc are protected"
    },
    {
      "id": "block_sys",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/sys/*"
      },
      "reason": "Kernel files in /sys are protected"
    },
    {
      "id": "block_bin",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/bin/*"
      },
      "reason": "System binaries are protected"
    },
    {
      "id": "block_usr_bin",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/usr/bin/*"
      },
      "reason": "System binaries are protected"
    }
  ]
}
```

**Use case:** Prevent AI agents like OpenClaw from accidentally deleting system files during file cleanup operations.

---

### 2. Audit Shell Commands

Log all shell command executions for security audit.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "log_all_shell_commands",
      "action": "execute_shell",
      "effect": "warn",
      "reason": "Shell command execution is logged for audit purposes"
    },
    {
      "id": "block_dangerous_commands",
      "action": "execute_shell",
      "effect": "deny",
      "conditions": {
        "commandPattern": "rm -rf /*"
      },
      "reason": "Destructive recursive delete is blocked"
    }
  ]
}
```

**Use case:** Monitor all shell commands executed by AI agents while blocking obviously dangerous operations.

---

## Multi-Environment Policies

### 3. Separate Dev/Staging/Prod

Different governance rules for different environments.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "dev_cannot_write_prod",
      "action": "database_write",
      "effect": "deny",
      "conditions": {
        "userPattern": "dev_*",
        "pathPattern": "/prod/*"
      },
      "reason": "Dev users cannot write to production database"
    },
    {
      "id": "dev_cannot_deploy_prod",
      "action": "deploy",
      "effect": "deny",
      "conditions": {
        "userPattern": "dev_*",
        "environmentPattern": "prod*"
      },
      "reason": "Dev users cannot deploy to production"
    },
    {
      "id": "staging_warn_on_writes",
      "action": "database_write",
      "effect": "warn",
      "conditions": {
        "pathPattern": "/staging/*"
      },
      "reason": "Writing to staging database - ensure this is intentional"
    }
  ]
}
```

**Use case:** Prevent accidental production database modifications by developers or test agents.

---

### 4. Role-Based Access Control

Different permissions for different user roles.

```json
{
  "defaultEffect": "deny",
  "rules": [
    {
      "id": "admin_full_access",
      "action": "*",
      "effect": "allow",
      "conditions": {
        "userPattern": "admin_*"
      }
    },
    {
      "id": "analyst_read_only",
      "action": "read_*",
      "effect": "allow",
      "conditions": {
        "userPattern": "analyst_*"
      }
    },
    {
      "id": "analyst_cannot_write",
      "action": "write_*",
      "effect": "deny",
      "conditions": {
        "userPattern": "analyst_*"
      },
      "reason": "Analyst role is read-only"
    },
    {
      "id": "bot_limited_actions",
      "action": "execute_tool",
      "effect": "allow",
      "conditions": {
        "userPattern": "bot_*",
        "toolPattern": "web_search|calculator|date"
      }
    }
  ]
}
```

**Use case:** Implement role-based permissions for multi-user AI agent systems.

---

## Cost Control Policies

### 5. Budget Tiers

Different budget limits based on user tier.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "free_tier_budget",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "userPattern": "free_*",
        "maxCost": 1.0
      },
      "reason": "Free tier budget is $1.00 per day"
    },
    {
      "id": "pro_tier_budget",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "userPattern": "pro_*",
        "maxCost": 10.0
      },
      "reason": "Pro tier approaching $10.00 daily limit"
    },
    {
      "id": "enterprise_high_cost_alert",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "userPattern": "enterprise_*",
        "maxCost": 50.0
      },
      "reason": "Enterprise tier: High-cost LLM call detected"
    }
  ]
}
```

**Use case:** Implement tiered pricing for SaaS AI agent platforms.

---

### 6. Expensive Operation Warnings

Warn before executing high-cost operations.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "warn_expensive_model",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "modelPattern": "gpt-4*",
        "maxCost": 0.1
      },
      "reason": "GPT-4 call will cost more than $0.10"
    },
    {
      "id": "warn_large_context",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "contextLength": 100000
      },
      "reason": "Large context window (100k+ tokens) will incur significant costs"
    },
    {
      "id": "block_extreme_costs",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "maxCost": 5.0
      },
      "reason": "Single LLM call exceeds $5.00 - likely a mistake"
    }
  ]
}
```

**Use case:** Prevent runaway LLM costs in autonomous agent loops.

---

## Security Policies

### 7. Prevent Data Exfiltration

Block potential data leakage.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_secrets_in_logs",
      "action": "log_message",
      "effect": "deny",
      "conditions": {
        "contentPattern": ".*API_KEY.*|.*SECRET.*|.*PASSWORD.*"
      },
      "reason": "Detected potential secret in log message"
    },
    {
      "id": "block_large_file_uploads",
      "action": "file_upload",
      "effect": "deny",
      "conditions": {
        "fileSizeMB": 100
      },
      "reason": "File uploads over 100MB are blocked to prevent data exfiltration"
    },
    {
      "id": "warn_external_api_calls",
      "action": "http_request",
      "effect": "warn",
      "conditions": {
        "urlPattern": "https://external-*"
      },
      "reason": "API call to external service is logged"
    }
  ]
}
```

**Use case:** Prevent AI agents from accidentally logging secrets or exfiltrating data.

---

### 8. Restrict Network Access

Limit which external services agents can access.

```json
{
  "defaultEffect": "deny",
  "rules": [
    {
      "id": "allow_approved_apis",
      "action": "http_request",
      "effect": "allow",
      "conditions": {
        "urlPattern": "https://api.openai.com/*|https://api.anthropic.com/*"
      }
    },
    {
      "id": "allow_internal_services",
      "action": "http_request",
      "effect": "allow",
      "conditions": {
        "urlPattern": "http://localhost:*|http://127.0.0.1:*"
      }
    },
    {
      "id": "block_all_other_requests",
      "action": "http_request",
      "effect": "deny",
      "reason": "Only approved APIs are accessible"
    }
  ]
}
```

**Use case:** Whitelist approved APIs for enterprise AI agents.

---

## Operational Policies

### 9. Time-Based Restrictions

Allow certain operations only during specific hours.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_deploys_outside_business_hours",
      "action": "deploy",
      "effect": "deny",
      "conditions": {
        "timeWindow": {
          "start": "18:00",
          "end": "09:00"
        }
      },
      "reason": "Deployments are only allowed during business hours (9 AM - 6 PM)"
    },
    {
      "id": "allow_maintenance_overnight",
      "action": "database_maintenance",
      "effect": "allow",
      "conditions": {
        "timeWindow": {
          "start": "22:00",
          "end": "06:00"
        }
      }
    }
  ]
}
```

**Use case:** Prevent disruptive operations during peak hours.

---

### 10. Rate Limiting by Action Type

Different rate limits for different operations.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "limit_llm_calls",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "rateLimit": {
          "calls": 100,
          "period": "minute"
        }
      },
      "reason": "LLM calls limited to 100 per minute"
    },
    {
      "id": "limit_api_requests",
      "action": "http_request",
      "effect": "deny",
      "conditions": {
        "rateLimit": {
          "calls": 1000,
          "period": "minute"
        }
      },
      "reason": "API requests limited to 1000 per minute"
    }
  ]
}
```

**Use case:** Prevent API abuse and manage resource consumption.

---

## Complex Scenarios

### 11. OpenClaw Integration

Complete policy for OpenClaw autonomous agent.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "openclaw_protect_system_files",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/etc/*|/sys/*|/bin/*|/usr/*"
      },
      "reason": "System files are protected from OpenClaw"
    },
    {
      "id": "openclaw_log_shell_commands",
      "action": "execute_shell",
      "effect": "warn",
      "reason": "OpenClaw shell commands are logged for audit"
    },
    {
      "id": "openclaw_budget_limit",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "userPattern": "openclaw_*",
        "maxCost": 10.0
      },
      "reason": "OpenClaw daily budget is $10.00"
    },
    {
      "id": "openclaw_expensive_call_warning",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "userPattern": "openclaw_*",
        "maxCost": 0.1
      },
      "reason": "OpenClaw LLM call exceeds $0.10"
    },
    {
      "id": "openclaw_rate_limit",
      "action": "*",
      "effect": "deny",
      "conditions": {
        "userPattern": "openclaw_*",
        "rateLimit": {
          "calls": 100,
          "period": "second"
        }
      },
      "reason": "OpenClaw rate limited to 100 actions/second"
    }
  ]
}
```

**Use case:** Production-ready governance for OpenClaw agent with multiple safety layers.

---

### 12. Multi-Agent Collaboration

Policies for multiple agents working together.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "coordinator_can_delegate",
      "action": "delegate_task",
      "effect": "allow",
      "conditions": {
        "userPattern": "coordinator_*"
      }
    },
    {
      "id": "workers_cannot_delegate",
      "action": "delegate_task",
      "effect": "deny",
      "conditions": {
        "userPattern": "worker_*"
      },
      "reason": "Worker agents cannot delegate tasks"
    },
    {
      "id": "shared_budget_pool",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "teamPattern": "team_alpha",
        "maxCost": 50.0
      },
      "reason": "Team Alpha shared budget is $50.00"
    },
    {
      "id": "prevent_agent_loops",
      "action": "delegate_task",
      "effect": "deny",
      "conditions": {
        "recursionDepth": 5
      },
      "reason": "Task delegation depth limited to 5 to prevent infinite loops"
    }
  ]
}
```

**Use case:** Govern multi-agent systems with hierarchical task delegation.

---

### 13. Content Moderation

Block inappropriate content generation.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_harmful_content_requests",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "promptPattern": ".*violence.*|.*illegal.*|.*hate.*"
      },
      "reason": "Harmful content requests are blocked"
    },
    {
      "id": "warn_sensitive_topics",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "promptPattern": ".*medical advice.*|.*legal advice.*"
      },
      "reason": "Request involves sensitive topic - ensure appropriate disclaimer"
    }
  ]
}
```

**Use case:** Content safety for customer-facing AI agents.

---

### 14. Gradual Rollout

Progressive permissions as agent proves reliability.

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "new_agent_restricted",
      "action": "database_write",
      "effect": "deny",
      "conditions": {
        "agentAgeHours": 24
      },
      "reason": "New agents (<24h old) cannot write to database"
    },
    {
      "id": "new_agent_low_budget",
      "action": "llm_call",
      "effect": "deny",
      "conditions": {
        "agentAgeHours": 24,
        "maxCost": 1.0
      },
      "reason": "New agents limited to $1.00 budget for first 24 hours"
    },
    {
      "id": "proven_agent_full_access",
      "action": "*",
      "effect": "allow",
      "conditions": {
        "agentAgeHours": 168,
        "successRate": 0.95
      }
    }
  ]
}
```

**Use case:** Gradually increase agent permissions as trust is established.

---

## Policy Composition

### 15. Layered Policies

Combine multiple policy concerns.

```json
{
  "defaultEffect": "allow",
  "rules": [
    // Layer 1: Security
    {
      "id": "security_block_system_files",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/etc/*|/sys/*"
      },
      "reason": "[Security] System files protected"
    },

    // Layer 2: Cost Control
    {
      "id": "cost_warn_expensive_calls",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "maxCost": 0.1
      },
      "reason": "[Cost] LLM call exceeds $0.10"
    },

    // Layer 3: Compliance
    {
      "id": "compliance_log_pii_access",
      "action": "read_user_data",
      "effect": "warn",
      "conditions": {
        "dataType": "pii"
      },
      "reason": "[Compliance] PII access logged for audit"
    },

    // Layer 4: Operations
    {
      "id": "ops_no_deploy_friday",
      "action": "deploy",
      "effect": "deny",
      "conditions": {
        "dayOfWeek": "Friday"
      },
      "reason": "[Operations] No Friday deployments"
    }
  ]
}
```

**Use case:** Enterprise-grade multi-layer governance.

---

## Testing Your Policies

Use the Sentinel API to test policies before deployment:

```bash
# Test file deletion
curl -X POST http://localhost:11435/governance/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_agent",
    "action": "delete_file",
    "context": { "path": "/etc/passwd" }
  }'
```

**Expected response:**

```json
{
  "allowed": false,
  "reasons": ["System files in /etc are protected"],
  "warnings": []
}
```

---

## Best Practices

1. **Start permissive**: Begin with `"defaultEffect": "allow"` and add deny rules incrementally
2. **Use warnings first**: Use `"effect": "warn"` to monitor before blocking
3. **Layer policies**: Separate security, cost, and operational concerns
4. **Test thoroughly**: Test policies against expected scenarios before production
5. **Monitor audit logs**: Review blocked actions regularly to tune policies
6. **Version control**: Store policies in Git alongside your code
7. **Document reasons**: Always include clear `"reason"` fields for blocked actions

---

## Further Reading

- [API Documentation](./API.md) - Complete API reference
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [README](../README.md) - Project overview

---

**Have a policy use case not covered here?** Open an issue or PR at [github.com/Henghenggao/yigcore-sentinel](https://github.com/Henghenggao/yigcore-sentinel)
