# OpenClaw + Yigcore Sentinel Integration Example

This example demonstrates how to add governance to [OpenClaw](https://github.com/openclaw/openclaw) or any Python AI agent using Yigcore Sentinel.

## Quick Start

### 1. Start Sentinel Server

```bash
# Terminal 1: Start the Sentinel sidecar
cd yigcore-sentinel
npm install  # First time only
npm run dev
```

You should see:
```
🚀 Yigcore Sentinel running on http://0.0.0.0:11435
📋 Default budget: $10/user
```

### 2. Run the Example

```bash
# Terminal 2: Run the governed OpenClaw example
cd examples/openclaw_integration
python governed_openclaw.py
```

## What Does This Example Demonstrate?

### 1. **Policy Enforcement**
- ✅ Allows deleting files in `/tmp`
- ❌ Blocks deleting system files in `/etc`
- ⚠️  Warns when executing shell commands

### 2. **Budget Control**
- Tracks LLM API costs
- Blocks operations when budget limit is reached
- Default limit: $10.00 per user

### 3. **Rate Limiting**
- Prevents rapid-fire API calls
- Default limit: 100 requests per second
- Protects against accidental DoS

### 4. **Audit Logging**
- Every action is logged with timestamp
- Logs include: action, context, decision, reason
- Queryable via `/governance/audit` API

## Expected Output

```
=== OpenClaw with Yigcore Sentinel ===

📁 Scenario 1: File Operations
--------------------------------------------------
  Deleting: /tmp/test.txt
✅ Deleted /tmp/test.txt

  Deleting: /etc/passwd
❌ 🚫 Sentinel blocked: Policy violation: System files in /etc are protected

💻 Scenario 2: Shell Commands
--------------------------------------------------
  Executing: echo 'Hello World'
⚠️  Sentinel: Shell command execution is logged for audit purposes
✅ Executed: echo 'Hello World'

🤖 Scenario 3: LLM Calls (Budget Control)
--------------------------------------------------
✅ Call 0: LLM response for: Request 0: Explain quantum...
✅ Call 1: LLM response for: Request 1: Explain quantum...
...

🔥 Attempting 5000 LLM calls to test budget limit...
  ✅ Completed 0 calls...
  ✅ Completed 1000 calls...
  ...
❌ Budget exhausted at call 5000: Budget exceeded (used: $10.00, limit: $10.00)

⚡ Scenario 4: Rate Limiting
--------------------------------------------------
  ✅ Completed 0 calls...
  ✅ Completed 50 calls...
❌ Rate limited at call 100: Rate limit exceeded
```

## How It Works

### 1. Initialize Sentinel Client

```python
from yigcore_sentinel import init_sentinel

init_sentinel("http://localhost:11435")
```

### 2. Add `@governed` Decorator

```python
from yigcore_sentinel import governed

@governed(
    action="delete_file",
    cost_estimate=0.0,
    extract_context=lambda path: {"path": path}
)
def delete_file(path: str):
    os.remove(path)
```

### 3. Use Functions Normally

```python
# Sentinel checks this automatically
delete_file("/tmp/test.txt")  # ✅ Allowed
delete_file("/etc/passwd")    # ❌ Blocked
```

## Customizing Policies

Edit `policy.json` in the root directory:

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_production_db",
      "action": "database_write",
      "effect": "deny",
      "conditions": {
        "userPattern": "dev_*"
      },
      "reason": "Dev users cannot write to production DB"
    }
  ]
}
```

Then restart the Sentinel server.

## Querying Audit Logs

```bash
# Get all audit logs
curl http://localhost:11435/governance/audit

# Get logs for specific user
curl http://localhost:11435/governance/audit?userId=test_agent&limit=50

# Get governance stats
curl http://localhost:11435/governance/stats?userId=test_agent
```

## Integrating with Real OpenClaw

1. Install Sentinel:
   ```bash
   pip install yigcore-sentinel
   ```

2. Start Sentinel server:
   ```bash
   yigcore-sentinel start
   ```

3. Add to your OpenClaw code:
   ```python
   from yigcore_sentinel import init_sentinel, governed

   init_sentinel()

   @governed("execute_tool", cost_estimate=0.01)
   def execute_tool(tool_name, args):
       # Your OpenClaw tool execution logic
       pass
   ```

## FAQ

**Q: What happens if Sentinel server is down?**
A: By default, Sentinel uses "fail-open" mode - actions are allowed but a warning is logged. You can change this to "fail-closed" by setting `fail_open=False` in the decorator.

**Q: How do I reset the budget?**
A: ```bash
curl -X POST http://localhost:11435/governance/budget/reset \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_agent"}'
```

**Q: Can I use Sentinel with non-Python agents?**
A: Yes! Sentinel exposes an HTTP API. Any language that can make HTTP requests can use it.

**Q: How do I change the default budget?**
A: Set the `DEFAULT_BUDGET` environment variable:
```bash
DEFAULT_BUDGET=50.0 npm run dev
```

## Next Steps

- Read the [API Documentation](../../docs/API.md)
- Explore [Policy Examples](../../docs/POLICY_EXAMPLES.md)
- Check out the [full Python SDK reference](../../docs/PYTHON_SDK.md)

---

**Need help?** Open an issue at https://github.com/Henghenggao/yigcore-sentinel/issues
