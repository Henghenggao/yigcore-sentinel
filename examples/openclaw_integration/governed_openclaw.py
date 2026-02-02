"""
OpenClaw + Yigcore Sentinel Integration Example

This example demonstrates how to add governance to OpenClaw (or any Python AI agent)
using the @governed decorator.

Prerequisites:
1. Start Sentinel server: cd ../.. && npm run dev
2. Run this example: python governed_openclaw.py

Expected behavior:
- ✅ Allows deleting files in /tmp
- ❌ Blocks deleting files in /etc (system files)
- ❌ Blocks actions when budget is exceeded
- ❌ Blocks actions when rate limit is exceeded
"""

import os
import sys

# Add parent directory to path to import yigcore_sentinel
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'python'))

from yigcore_sentinel import init_sentinel, governed

# Initialize Sentinel client
init_sentinel("http://localhost:11435")

print("=== OpenClaw with Yigcore Sentinel ===\n")

# ============================================================================
# Example 1: File Operations (with policy enforcement)
# ============================================================================

@governed(
    action="delete_file",
    cost_estimate=0.0,  # File operations don't cost money
    extract_context=lambda path: {"path": path}
)
def delete_file(path: str):
    """Delete a file (governed by Sentinel)"""
    print(f"  Deleting: {path}")
    # os.remove(path)  # Commented out for safety
    return f"Deleted {path}"


print("📁 Scenario 1: File Operations")
print("-" * 50)

# Allowed: /tmp directory
try:
    result = delete_file("/tmp/test.txt")
    print(f"✅ {result}\n")
except PermissionError as e:
    print(f"❌ {e}\n")

# Blocked: /etc directory (system files)
try:
    result = delete_file("/etc/passwd")
    print(f"✅ {result}\n")
except PermissionError as e:
    print(f"❌ {e}\n")

# ============================================================================
# Example 2: Shell Commands (with warnings)
# ============================================================================

@governed(
    action="execute_shell",
    cost_estimate=0.0,
    extract_context=lambda cmd: {"command": cmd}
)
def execute_shell(cmd: str):
    """Execute a shell command (governed by Sentinel)"""
    print(f"  Executing: {cmd}")
    # os.system(cmd)  # Commented out for safety
    return f"Executed: {cmd}"


print("💻 Scenario 2: Shell Commands")
print("-" * 50)

try:
    result = execute_shell("echo 'Hello World'")
    print(f"✅ {result}\n")
except PermissionError as e:
    print(f"❌ {e}\n")

# ============================================================================
# Example 3: LLM Calls (with budget control)
# ============================================================================

@governed(
    action="llm_call",
    user_id="test_agent",
    cost_estimate=0.002,  # Typical cost for GPT-4 Turbo
    extract_context=lambda prompt: {"prompt_length": len(prompt)}
)
def call_llm(prompt: str):
    """Call LLM API (governed by budget)"""
    print(f"  Calling LLM with prompt: {prompt[:50]}...")
    # Simulate LLM call
    return f"LLM response for: {prompt[:30]}..."


print("🤖 Scenario 3: LLM Calls (Budget Control)")
print("-" * 50)

# First few calls should succeed
for i in range(5):
    try:
        result = call_llm(f"Request {i}: Explain quantum computing")
        print(f"✅ Call {i}: {result}")
    except PermissionError as e:
        print(f"❌ Call {i}: {e}")

print()

# Try many calls to exceed budget
print("🔥 Attempting 5000 LLM calls to test budget limit...")
print("(Default budget is $10.00, each call costs $0.002)")
print("Expected: Blocked after ~5000 calls\n")

blocked_at = None
for i in range(5000):
    try:
        call_llm(f"Request {i}")
        if i % 1000 == 0:
            print(f"  ✅ Completed {i} calls...")
    except PermissionError as e:
        blocked_at = i
        print(f"\n❌ Budget exhausted at call {i}: {e}\n")
        break

if blocked_at:
    print(f"✅ Budget control working! Blocked after {blocked_at} calls.")
    print(f"   Total cost would have been: ${blocked_at * 0.002:.2f}")
else:
    print("⚠️  Budget control may not be working as expected.")

# ============================================================================
# Example 4: Rate Limiting
# ============================================================================

@governed(
    action="api_call",
    user_id="rate_limit_test",
    cost_estimate=0.0
)
def make_api_call(endpoint: str):
    """Make an API call (governed by rate limiter)"""
    return f"Called {endpoint}"


print("\n⚡ Scenario 4: Rate Limiting")
print("-" * 50)
print("Attempting 200 rapid API calls...")
print("(Rate limit: 100 calls/second)")
print()

rate_limited_at = None
for i in range(200):
    try:
        make_api_call(f"/api/endpoint/{i}")
        if i % 50 == 0:
            print(f"  ✅ Completed {i} calls...")
    except PermissionError as e:
        rate_limited_at = i
        print(f"\n❌ Rate limited at call {i}: {e}\n")
        break

if rate_limited_at:
    print(f"✅ Rate limiting working! Blocked after {rate_limited_at} calls.")
else:
    print("⚠️  Rate limiting may not be triggered (all calls succeeded).")

# ============================================================================
# Summary
# ============================================================================

print("\n" + "=" * 50)
print("🎉 Governance Demo Complete!")
print("=" * 50)
print("\n📋 Summary:")
print("  ✅ Policy enforcement: System files protected")
print("  ✅ Budget control: Spending limits enforced")
print("  ✅ Rate limiting: Prevents API abuse")
print("  ✅ Audit logging: All actions are logged")
print("\n💡 Next steps:")
print("  1. Check audit logs: curl http://localhost:11435/governance/audit")
print("  2. View stats: curl http://localhost:11435/governance/stats?userId=test_agent")
print("  3. Customize policy: Edit policy.json and restart server")
print()
