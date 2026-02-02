# Yigcore Sentinel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-green)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-0.3.0-blue)](https://github.com/Henghenggao/yigcore-sentinel/releases)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://github.com/Henghenggao/yigcore-sentinel/blob/main/Dockerfile)

**Lightweight governance layer for AI agents** - Add budget control, audit logging, and policy enforcement to any AI agent in minutes.

> 🎉 **v0.3.0 Released!** Now with Persistence Layer (SQLite/File), Enterprise Preview Dashboard, and more. [See what's new →](./RELEASE_NOTES_v0.3.0.md)

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/Henghenggao/yigcore-sentinel.git
cd yigcore-sentinel
docker compose up -d
```

Access the dashboard at **http://localhost:11435/dashboard/**

### npm/Node.js

```bash
git clone https://github.com/Henghenggao/yigcore-sentinel.git
cd yigcore-sentinel
npm install
npm run dev
```

You should see:
```
🚀 Yigcore Sentinel running on http://0.0.0.0:11435
💰 Restored budget usage for 0 users
⚡ Rate limit: Not initialized
📜 Policy: 5 rules loaded
📊 Dashboard available at /dashboard/
```

### 2. Add to Your Python Agent

```bash
cd python
pip install -e .
```

```python
from yigcore_sentinel import init_sentinel, governed

init_sentinel()

@governed("delete_file", cost_estimate=0.0)
def delete_file(path: str):
    os.remove(path)

# Sentinel automatically checks before execution
delete_file("/tmp/test.txt")  # ✅ Allowed
delete_file("/etc/passwd")    # ❌ Blocked by policy
```

That's it! Your agent is now governed.

---

## 🎯 Why Sentinel?

AI agents like [OpenClaw](https://github.com/openclaw/openclaw) and custom autonomous systems are **powerful but risky**:

| Risk | Without Sentinel | With Sentinel |
|------|-----------------|---------------|
| **Runaway costs** | Agent spends $1000 overnight | ✅ Budget limit: $10/day |
| **No audit trail** | "What did it do?" | ✅ Every action logged |
| **Dangerous ops** | Deletes system files | ✅ Policy blocks `/etc/*` |
| **API abuse** | 10,000 calls/second | ✅ Rate limit: 100/sec |

**Sentinel solves this** by running as a lightweight sidecar that governs every action.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Your AI Agent (Python/JS/Any)          │
│  - OpenClaw                              │
│  - Custom Agent                          │
└──────────────┬──────────────────────────┘
               │ HTTP/REST
               ↓
┌─────────────────────────────────────────┐
│  Sentinel Sidecar (localhost:11435)     │
│  ┌─────────────────────────────────┐   │
│  │ 1. Rate Limiter   (Token Bucket)│   │
│  │ 2. Budget Guard   (Cost Tracking│   │
│  │ 3. Policy Engine  (Rule-based)  │   │
│  │ 4. Audit Logger   (Structured)  │   │
│  └────────┬──────────────────┬─────┘   │
└───────────┼──────────────────┼──────────┘
            │                  │
            ▼                  ▼
    ┌───────────────┐  ┌───────────────┐
    │  audit.db     │  │  budget.json  │
    └───────────────┘  └───────────────┘
```

**Sidecar benefits**:
- ✅ **Language-agnostic**: Works with Python, JavaScript, Go, Rust, any language
- ✅ **Non-invasive**: No deep integration required
- ✅ **Fail-open**: If Sentinel crashes, agent continues (configurable)
- ✅ **Observable**: Query audit logs, stats, and metrics via HTTP API

---

## ✨ Features

### 🌐 Web Dashboard (Updated v0.3.0)

Real-time monitoring and management:
- 📊 **Enterprise Preview**: Explore advanced capabilities like Bandit Router and DAG Analytics.
- 📈 Live budget tracking with persistent history.
- 📝 Persistent audit log stream (SQLite backed).
- 👥 Per-user statistics.
- 🔄 One-click budget reset.

**Access:** `http://localhost:11435/dashboard/`

### 🛡️ Persistence Layer (NEW in v0.3.0)
- **Zero-Config SQLite**: Audit logs are automatically saved to `audit.db`.
- **Budget Snapshot**: Usage data is persisted to `budget.json` (auto-save + graceful shutdown).
- **Restart Safe**: Governance state survives server restarts.

### 1. Budget Guard
Control spending on LLM API calls:
```python
@governed("llm_call", cost_estimate=0.002)  # $0.002 per call
def call_gpt4(prompt: str):
    return openai.ChatCompletion.create(...)
```

- Per-user/per-agent budgets
- Real-time cost tracking
- Automatic blocking when limit exceeded

### 2. Policy Engine
Define what's allowed and what's not:
```json
{
  "rules": [
    {
      "id": "block_system_files",
      "action": "delete_file",
      "effect": "deny",
      "conditions": { "pathPattern": "/etc/*" }
    }
  ]
}
```

- Rule-based (no LLM needed - fast!)
- Wildcard matching (`delete_*` matches `delete_file`, `delete_dir`)
- Contextual conditions (path, cost, user, time window)

### 3. Rate Limiter
Prevent abuse and runaway loops:
- Token bucket algorithm (sustained rate)
- Per-user limits
- Configurable capacity and refill rate

### 4. Audit Logger
Every decision is logged:
```json
{
  "type": "governance_block",
  "timestamp": 1706825400000,
  "agentId": "openclaw_agent",
  "action": "delete_file",
  "reason": "policy_violation",
  "details": { "path": "/etc/passwd", "matchedRule": "block_system_files" }
}
```

- Structured JSON logs
- Queryable via HTTP API
- Retention configurable (in-memory or persistent)

---

## 📚 Use Cases

### 1. OpenClaw Integration
[OpenClaw](https://github.com/openclaw/openclaw) is a powerful autonomous agent that can execute shell commands, delete files, and call APIs without limits.

**Problem**: In testing, OpenClaw accidentally:
- Deleted production database files
- Spent $847 on LLM calls in one night
- Made 50,000 API calls causing rate limit bans

**Solution with Sentinel**:
```python
from yigcore_sentinel import init_sentinel, governed

init_sentinel()

# Wrap OpenClaw's dangerous operations
@governed("execute_shell", extract_context=lambda cmd: {"command": cmd})
def execute_command(cmd: str):
    return openclaw.run_shell(cmd)  # Sentinel checks first
```

Result:
- ✅ Shell commands logged and auditable
- ✅ Budget set to $10/day (configurable)
- ✅ System file modifications blocked
- ✅ Rate limiting prevents API abuse

**See full example**: [examples/openclaw_integration](./examples/openclaw_integration)

### 2. Development vs Production
Different policies for different environments:
```json
{
  "rules": [
    {
      "id": "dev_cannot_write_prod_db",
      "action": "database_write",
      "effect": "deny",
      "conditions": { "userPattern": "dev_*" }
    }
  ]
}
```

---

## 🔌 HTTP API

### POST `/governance/check`
```json
{
  "userId": "agent_123",
  "action": "delete_file",
  "context": { "path": "/tmp/test.txt" },
  "costEstimate": 0.01
}
```

### GET `/governance/audit`
Query audit logs (filter by user, limit results).

### GET `/governance/stats?userId=agent_123`
Get budget usage and rate limit stats.

### GET `/dashboard/` (NEW in v0.2.0)
Web-based monitoring dashboard with real-time updates.

**📖 [Complete API Documentation →](./docs/API.md)**

---

## 🐳 Deployment

Multiple deployment options for production:

### Docker Compose (Recommended)
```bash
docker compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
```

### npm Global Install
```bash
npm install -g yigcore-sentinel
yigcore-sentinel start --daemon --budget 50
```

### systemd Service (Linux)
```bash
sudo systemctl enable sentinel
sudo systemctl start sentinel
```

**📖 [Complete Deployment Guide →](./DEPLOYMENT.md)**

---

## 🛣️ Roadmap

- [x] **v0.1.0** - Core governance (Budget, Audit, Rate Limit, Policy)
- [x] **v0.1.0** - Python SDK
- [x] **v0.2.0** - Web dashboard for real-time monitoring ✨
- [x] **v0.2.0** - Docker & docker-compose support ✨
- [x] **v0.2.0** - CLI tool with daemon mode ✨
- [x] **v0.3.0** - Persistence Layer (SQLite + File) ✨
- [x] **v0.3.0** - Enterprise Preview Dashboard ✨
- [ ] **v0.4.0** - JavaScript/TypeScript SDK (Planned Q1 2026)
- [ ] **v0.5.0** - LLM-based Policy Engine (Planned Q2 2026)
- [ ] **Future** - Multi-language SDKs, HA deployment, and more

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and [GitHub Issues](https://github.com/Henghenggao/yigcore-sentinel/issues) for planned features.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Links

- 🚀 [Deployment Guide](./DEPLOYMENT.md) - Production deployment options
- 📖 [API Documentation](./docs/API.md) - Complete API reference
- 📋 [Policy Examples](./docs/POLICY_EXAMPLES.md) - Real-world policy configurations
- 💡 [Examples](./examples/) - Integration examples (OpenClaw, etc.)
- 📝 [Release Notes](./RELEASE_NOTES_v0.2.0.md) - What's new in v0.2.0

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Inspired by [OpenClaw](https://github.com/openclaw/openclaw) and the need for safer AI agents.

Open source contributions welcome!

---

**⭐ If you find Sentinel useful, please star this repo!**

---

*Sentinel: Make AI agents safe, auditable, and cost-effective.*
