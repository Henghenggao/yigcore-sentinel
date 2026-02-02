# Release Notes - v0.2.0

**Release Date:** 2026-02-02
**Status:** Production Ready 🚀

---

## 🎉 What's New in v0.2.0

### 🌐 Web Dashboard

The biggest feature in v0.2.0 is the **real-time Web Dashboard** for monitoring and managing AI agent governance.

**Features:**
- ✅ Real-time budget tracking with visual progress bars
- ✅ Live audit log stream with filtering
- ✅ Per-user statistics (budget usage, rate limits)
- ✅ One-click budget reset
- ✅ Auto-refresh every 5 seconds
- ✅ Responsive design (works on mobile/tablet)
- ✅ Dark theme optimized for long monitoring sessions

**Access:** `http://localhost:11435/dashboard/`

![Dashboard Screenshot](docs/images/dashboard-preview.png)

---

### 🐳 Production-Ready Docker Deployment

Complete containerization support for real-world deployments:

**New Files:**
- `Dockerfile` - Multi-stage build for minimal image size (~100MB)
- `docker-compose.yml` - Full stack with Sentinel + OpenClaw example
- `.dockerignore` - Optimized build context
- `.env.example` - Environment configuration template

**Features:**
- ✅ Multi-stage build (builder + runtime)
- ✅ Non-root user for security
- ✅ Health checks built-in
- ✅ Automatic restarts
- ✅ Volume mounts for custom policies
- ✅ Resource limits (256MB default)

**Quick Start:**
```bash
docker compose up -d
```

---

### 🎯 CLI Tool

New command-line interface for easy server management:

```bash
# Start server
yigcore-sentinel start --port 11435 --budget 50

# Start as background daemon
yigcore-sentinel start --daemon

# Check status
yigcore-sentinel status

# Stop daemon
yigcore-sentinel stop
```

**Features:**
- ✅ Daemon mode with PID tracking
- ✅ Custom port/budget/rate-limit configuration
- ✅ Policy file override
- ✅ Log level control
- ✅ Graceful shutdown handling

---

### 🛡️ Enhanced Reliability

**Graceful Shutdown:**
- Handles SIGINT/SIGTERM properly
- 10-second shutdown timeout
- Flushes audit logs before exit
- Uncaught exception handling

**Health Checks:**
- `/health` endpoint now returns dashboard availability
- Compatible with Docker/Kubernetes liveness probes
- Version information included

**Error Handling:**
- Improved logging with structured JSON
- Better error messages for debugging
- Fail-safe policy loading

---

## 📦 Breaking Changes

None! v0.2.0 is **fully backward compatible** with v0.1.0.

All existing API endpoints, policy formats, and integrations continue to work without modification.

---

## 🔧 Improvements

### Performance
- Optimized TypeScript build output
- Reduced Docker image size (Alpine base)
- Faster startup time (<2s)

### Developer Experience
- New `npm run docker:build` script
- Comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Better error messages in logs
- Type definitions for all components

### Documentation
- New deployment guide with 5 deployment methods
- Kubernetes example manifests
- Systemd service file example
- Troubleshooting section

---

## 📊 Dashboard Tech Stack

Built with modern, performant technologies:

- **React 18.2** - UI framework
- **TypeScript 5.3** - Type safety
- **Vite 5.1** - Lightning-fast build tool
- **Recharts 2.10** - Charts (future use)
- **date-fns 3.0** - Date formatting

**Bundle Size:** ~150KB gzipped

---

## 🚀 Quick Upgrade Guide

### From v0.1.0 to v0.2.0

#### npm/Source Install:
```bash
cd yigcore-sentinel
git pull origin main
npm install  # Adds @fastify/static dependency
npm run build
npm start
```

#### Docker:
```bash
docker pull yigcore-sentinel:0.2.0
docker compose up -d
```

#### Global Install:
```bash
npm update -g yigcore-sentinel
yigcore-sentinel start --daemon
```

---

## 📝 Full Changelog

### Added
- 🌐 Web dashboard (`/dashboard/` endpoint)
- 🐳 Dockerfile and docker-compose.yml
- 🎯 CLI tool (`src/cli.ts`)
- 📄 DEPLOYMENT.md guide
- 📦 `.env.example` configuration template
- 🔧 npm Docker scripts (`docker:build`, `docker:compose:up`, etc.)
- 🛡️ Enhanced graceful shutdown with timeout
- 📊 Dashboard availability in `/health` response

### Changed
- 📌 Version bumped to 0.2.0 across all packages
- 🎨 `/` endpoint now lists dashboard in API documentation
- 🔧 package.json: Added `@fastify/static` dependency

### Fixed
- 🐛 TypeScript compilation errors in logger calls
- 🔒 Non-root user in Docker for security
- 📝 Proper error handling in shutdown hooks

---

## 🔮 What's Next

We're working on enhancements based on community feedback. Check [GitHub Issues](https://github.com/Henghenggao/yigcore-sentinel/issues) for planned features and join the discussion!

---

## 🙏 Contributors

Thanks to everyone who contributed to v0.2.0 through testing, feedback, and feature requests!

---

## 📚 Resources

- **Documentation:** [README.md](./README.md)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Reference:** [docs/API.md](./docs/API.md)
- **Policy Examples:** [docs/POLICY_EXAMPLES.md](./docs/POLICY_EXAMPLES.md)
- **GitHub:** https://github.com/Henghenggao/yigcore-sentinel
- **Issues:** https://github.com/Henghenggao/yigcore-sentinel/issues

---

## ⚡ Try It Now

```bash
# Clone and run
git clone https://github.com/Henghenggao/yigcore-sentinel.git
cd yigcore-sentinel
docker compose up -d

# Open dashboard
open http://localhost:11435/dashboard/

# Run example
cd examples/openclaw_integration
python governed_openclaw.py
```

---

**Questions?** Open a [GitHub Discussion](https://github.com/Henghenggao/yigcore-sentinel/discussions)

**Found a bug?** [Report an issue](https://github.com/Henghenggao/yigcore-sentinel/issues/new)

**Love it?** Give us a ⭐ on [GitHub](https://github.com/Henghenggao/yigcore-sentinel)!
