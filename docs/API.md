# Yigcore Sentinel API Documentation

Complete API reference for the Yigcore Sentinel HTTP server and SDK.

## Table of Contents

- [HTTP API](#http-api)
  - [Governance Endpoints](#governance-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Python SDK](#python-sdk)
- [TypeScript/JavaScript SDK](#typescriptjavascript-sdk)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## HTTP API

Base URL: `http://localhost:11435` (default)

All endpoints return JSON responses.

### Governance Endpoints

#### `POST /governance/check`

Check if an action is allowed by governance policies.

**Request Body:**

```json
{
  "userId": "string",           // Required: User/agent identifier
  "action": "string",           // Required: Action name (e.g., "delete_file")
  "context": {                  // Optional: Action-specific context
    "path": "/etc/passwd",      //   - File path
    "command": "rm -rf /",      //   - Shell command
    "cost": 0.15                //   - Estimated cost
  },
  "costEstimate": 0.01          // Optional: Cost in USD
}
```

**Response:**

```json
{
  "allowed": true,              // true if action is permitted
  "reasons": [],                // Reasons if blocked
  "warnings": ["Shell command execution is logged for audit purposes"]
}
```

**Status Codes:**

- `200 OK`: Decision made (check `allowed` field)
- `400 Bad Request`: Invalid request payload
- `500 Internal Server Error`: Server error

**Example:**

```bash
curl -X POST http://localhost:11435/governance/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "agent_123",
    "action": "delete_file",
    "context": { "path": "/tmp/test.txt" },
    "costEstimate": 0.0
  }'
```

**Response:**

```json
{
  "allowed": true,
  "reasons": [],
  "warnings": []
}
```

---

#### `GET /governance/audit`

Query audit logs.

**Query Parameters:**

- `userId` (optional): Filter by user ID
- `limit` (optional): Maximum number of entries (default: 100, max: 1000)
- `offset` (optional): Number of entries to skip (default: 0)

**Response:**

```json
{
  "logs": [
    {
      "type": "governance_block",
      "timestamp": 1706825400000,
      "agentId": "agent_123",
      "action": "delete_file",
      "reason": "policy_violation",
      "details": {
        "path": "/etc/passwd",
        "matchedRule": "block_system_files"
      }
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 100
}
```

**Example:**

```bash
# Get last 50 logs for agent_123
curl "http://localhost:11435/governance/audit?userId=agent_123&limit=50"
```

---

#### `GET /governance/stats`

Get governance statistics for a user.

**Query Parameters:**

- `userId` (required): User ID to query

**Response:**

```json
{
  "userId": "agent_123",
  "budgetUsage": {
    "used": 8.50,
    "limit": 10.00,
    "remaining": 1.50
  },
  "rateLimiting": {
    "available": 95,
    "capacity": 100
  },
  "totalActions": 1523,
  "blockedActions": 12
}
```

**Example:**

```bash
curl "http://localhost:11435/governance/stats?userId=agent_123"
```

---

### Admin Endpoints

#### `POST /governance/budget/reset`

Reset a user's budget usage to zero.

**Request Body:**

```json
{
  "userId": "agent_123"
}
```

**Response:**

```json
{
  "success": true,
  "userId": "agent_123",
  "resetAt": 1706825400000
}
```

**Example:**

```bash
curl -X POST http://localhost:11435/governance/budget/reset \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent_123"}'
```

---

#### `POST /governance/budget/set-limit`

Set custom budget limit for a user.

**Request Body:**

```json
{
  "userId": "agent_123",
  "limit": 50.0            // New budget limit in USD
}
```

**Response:**

```json
{
  "success": true,
  "userId": "agent_123",
  "newLimit": 50.0
}
```

**Example:**

```bash
curl -X POST http://localhost:11435/governance/budget/set-limit \
  -H "Content-Type: application/json" \
  -d '{"userId": "premium_user", "limit": 100.0}'
```

---

#### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "0.3.0"
}
```

**Example:**

```bash
curl http://localhost:11435/health
```

---

## Python SDK

### Installation

```bash
pip install yigcore-sentinel
```

### Initialization

```python
from yigcore_sentinel import init_sentinel

# Initialize with default settings (localhost:11435)
init_sentinel()

# Or specify custom URL
init_sentinel("http://localhost:11435")
```

### `@governed` Decorator

Wrap any function to add governance checks.

**Syntax:**

```python
@governed(
    action: str,                           # Required: Action name
    user_id: str = "default_agent",        # Optional: User ID
    cost_estimate: Optional[float] = None, # Optional: Cost in USD
    extract_context: Optional[Callable] = None, # Optional: Context extractor
    fail_open: bool = True                 # Optional: Fail-open mode
)
```

**Parameters:**

- `action`: Action name (e.g., `"delete_file"`, `"execute_shell"`, `"llm_call"`)
- `user_id`: User or agent identifier (default: `"default_agent"`)
- `cost_estimate`: Estimated cost of the operation in USD (default: `None`)
- `extract_context`: Function to extract context from function arguments
- `fail_open`: If `True`, allow action when Sentinel is unavailable (default: `True`)

**Returns:**

- Decorated function that checks governance before execution

**Raises:**

- `PermissionError`: If action is blocked by governance policies

**Example:**

```python
from yigcore_sentinel import governed

@governed(
    action="delete_file",
    cost_estimate=0.0,
    extract_context=lambda path: {"path": path}
)
def delete_file(path: str):
    import os
    os.remove(path)

# Usage
delete_file("/tmp/test.txt")  # ✅ Allowed
delete_file("/etc/passwd")    # ❌ Raises PermissionError
```

### Context Extraction

The `extract_context` parameter accepts a function that receives the decorated function's arguments and returns a dictionary of context data.

**Example:**

```python
@governed(
    action="llm_call",
    user_id="my_agent",
    cost_estimate=0.002,
    extract_context=lambda prompt, model="gpt-4": {
        "prompt_length": len(prompt),
        "model": model
    }
)
def call_llm(prompt: str, model: str = "gpt-4"):
    # Your LLM call logic
    pass
```

### Manual Governance Check

For more control, use the client directly:

```python
from yigcore_sentinel import get_client

client = get_client()

decision = client.check_action(
    user_id="agent_123",
    action="database_write",
    context={"table": "users", "operation": "DELETE"},
    cost_estimate=0.01
)

if not decision["allowed"]:
    print(f"Blocked: {decision['reasons']}")
else:
    # Proceed with action
    pass
```

### Error Handling

```python
from yigcore_sentinel import governed

@governed("dangerous_action")
def dangerous_operation():
    # Your code here
    pass

try:
    dangerous_operation()
except PermissionError as e:
    print(f"Governance blocked: {e}")
    # Handle blocked action
```

---

## TypeScript/JavaScript SDK

### Installation

```bash
npm install yigcore-sentinel
```

### Programmatic Usage

```typescript
import { BudgetGuard, PolicyEngine, TokenBucket } from 'yigcore-sentinel';

// Budget Guard
const budgetGuard = new BudgetGuard(10.0); // $10 limit
if (budgetGuard.check('user1', 0.002)) {
  budgetGuard.deduct('user1', 0.002);
  // Perform action
}

// Policy Engine
import { createDefaultPolicy } from 'yigcore-sentinel';

const policyEngine = new PolicyEngine(createDefaultPolicy());
const decision = policyEngine.evaluate('delete_file', { path: '/etc/passwd' });

if (decision.effect === 'deny') {
  console.log(`Blocked: ${decision.reason}`);
}

// Token Bucket Rate Limiter
const rateLimiter = new TokenBucket({
  capacity: 100,
  refillRate: 10  // 10 tokens per second
});

if (rateLimiter.tryConsume(1)) {
  // Allowed
} else {
  // Rate limited
}
```

### HTTP Client (TypeScript)

```typescript
import axios from 'axios';

const SENTINEL_URL = 'http://localhost:11435';

async function checkAction(userId: string, action: string, context: any) {
  const response = await axios.post(`${SENTINEL_URL}/governance/check`, {
    userId,
    action,
    context,
    costEstimate: 0.01
  });

  return response.data.allowed;
}

// Usage
const allowed = await checkAction('agent_123', 'delete_file', {
  path: '/tmp/test.txt'
});
```

---

## Error Handling

### HTTP Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "BUDGET_EXCEEDED",
    "message": "User budget limit exceeded",
    "details": {
      "used": 10.5,
      "limit": 10.0
    }
  }
}
```

**Error Codes:**

- `BUDGET_EXCEEDED`: User has exceeded budget limit
- `RATE_LIMITED`: Too many requests
- `POLICY_VIOLATION`: Action blocked by policy
- `INVALID_REQUEST`: Malformed request
- `INTERNAL_ERROR`: Server error

### Python SDK Exceptions

```python
from yigcore_sentinel import governed
from yigcore_sentinel.exceptions import (
    GovernanceError,
    BudgetExceededError,
    RateLimitedError,
    PolicyViolationError
)

@governed("expensive_action", cost_estimate=15.0)
def expensive_operation():
    pass

try:
    expensive_operation()
except BudgetExceededError as e:
    print(f"Budget exceeded: {e}")
except RateLimitedError as e:
    print(f"Rate limited: {e}")
except PolicyViolationError as e:
    print(f"Policy violation: {e.reason}")
except GovernanceError as e:
    print(f"Governance error: {e}")
```

---

## Examples

### Example 1: File Operations

```python
from yigcore_sentinel import init_sentinel, governed
import os

init_sentinel()

@governed(
    action="delete_file",
    extract_context=lambda path: {"path": path}
)
def delete_file(path: str):
    os.remove(path)

# Safe deletion
delete_file("/tmp/test.txt")  # ✅ Allowed

# Protected system file
try:
    delete_file("/etc/passwd")  # ❌ Blocked
except PermissionError as e:
    print(f"Blocked: {e}")
```

### Example 2: LLM Calls with Budget

```python
@governed(
    action="llm_call",
    user_id="chatbot_user",
    cost_estimate=0.002,  # GPT-4 Turbo cost
    extract_context=lambda prompt: {"prompt_length": len(prompt)}
)
def call_gpt4(prompt: str):
    import openai
    return openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )

# This will be tracked against budget
response = call_gpt4("Explain quantum computing")
```

### Example 3: Shell Commands

```python
@governed(
    action="execute_shell",
    extract_context=lambda cmd: {"command": cmd}
)
def run_shell(cmd: str):
    import subprocess
    return subprocess.run(cmd, shell=True, capture_output=True)

# Logged and audited
run_shell("ls -la")

# Potentially dangerous commands are warned
run_shell("rm -rf /")  # ⚠️ Warning logged
```

### Example 4: Custom Policy

```python
from yigcore_sentinel import PolicyEngine, PolicyConfig

config: PolicyConfig = {
    "defaultEffect": "allow",
    "rules": [
        {
            "id": "block_prod_writes_by_devs",
            "action": "database_write",
            "effect": "deny",
            "conditions": {
                "userPattern": "dev_*",
                "pathPattern": "/prod/*"
            },
            "reason": "Dev users cannot write to production database"
        }
    ]
}

engine = PolicyEngine(config)

# Dev user trying to write to prod
decision = engine.evaluate("database_write", {
    "userId": "dev_alice",
    "path": "/prod/users"
})
# decision.effect == "deny"

# Dev user writing to dev DB
decision = engine.evaluate("database_write", {
    "userId": "dev_alice",
    "path": "/dev/users"
})
# decision.effect == "allow"
```

---

## Rate Limiting Configuration

Default rate limit: **100 requests/second** (burst capacity: 100)

**Adjust via environment variables:**

```bash
# 50 requests/second with burst of 200
RATE_LIMIT_CAPACITY=200 RATE_LIMIT_REFILL_RATE=50 npm run dev
```

**Custom configuration (TypeScript):**

```typescript
import { TokenBucket } from 'yigcore-sentinel';

const customRateLimiter = new TokenBucket({
  capacity: 1000,    // Burst capacity
  refillRate: 100    // Sustained rate (tokens/sec)
});
```

---

## Budget Configuration

Default budget: **$10.00 per user**

**Adjust via environment variables:**

```bash
# $50 default budget
DEFAULT_BUDGET=50.0 npm run dev
```

**Per-user budgets via API:**

```bash
curl -X POST http://localhost:11435/governance/budget/set-limit \
  -H "Content-Type: application/json" \
  -d '{"userId": "enterprise_user", "limit": 500.0}'
```

---

## Policy Configuration

Policies are defined in `policy.json` at the repository root.

**Example Policy:**

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_system_files",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/etc/*"
      },
      "reason": "System files are protected"
    },
    {
      "id": "warn_expensive_llm_calls",
      "action": "llm_call",
      "effect": "warn",
      "conditions": {
        "maxCost": 0.1
      },
      "reason": "LLM call exceeds $0.10 threshold"
    }
  ]
}
```

**Reload policy without restart:**

```bash
curl -X POST http://localhost:11435/governance/policy/reload
```

---

## WebSocket Support (Coming Soon)

Real-time governance notifications via WebSockets.

```javascript
const ws = new WebSocket('ws://localhost:11435/governance/stream');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Governance event:', notification);
};
```

---

## Further Reading

- [Policy Examples](./POLICY_EXAMPLES.md) - Real-world policy configurations
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [README](../README.md) - Project overview

---

**Need help?** Open an issue at [github.com/Henghenggao/yigcore-sentinel/issues](https://github.com/Henghenggao/yigcore-sentinel/issues)
