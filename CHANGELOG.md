# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- JavaScript/TypeScript SDK (v0.4.0)
- LLM-based Policy Engine (v0.5.0)
- Multi-agent coordination features

## [0.3.0] - 2026-02-02

### Added
- **Persistence Layer**:
  - SQLite audit store (`audit.db`) for long-term audit log retention via `better-sqlite3`
  - Budget persistence to JSON file (`budget.json`) with auto-save every 60s
  - Graceful shutdown with guaranteed data flush to disk
- **Enterprise Preview Dashboard**:
  - New "Enterprise" tab showcasing Yigcore Core advanced features
  - Lead generation form with "Request Demo" functionality
  - mailto integration for immediate sales inquiries
- **Storage Architecture**:
  - `src/storage/SQLiteAuditStore.ts` - SQLite backend implementation
  - `src/storage/BudgetPersistence.ts` - JSON file storage for budget state
  - `src/storage/AuditStore.ts` - Interface for pluggable storage backends
- **Dashboard Components**:
  - `dashboard/src/components/EnterpriseTab.tsx` - Enterprise features showcase
  - `dashboard/src/components/EnterpriseTab.css` - Styling for enterprise tab
- **Testing**:
  - E2E persistence verification tests (`tests/verify_persistence.ts`)
  - End-to-end restart safety tests (`tests/e2e_test.ts`)

### Changed
- **AuditLogger Refactor**:
  - Migrated to pluggable `AuditStore` interface
  - Removed legacy `InMemoryAuditLogger` in favor of `SQLiteAuditStore`
  - Unified logging interface across all governance modules
- **Server Architecture**:
  - Enhanced shutdown handling with SIGINT/SIGTERM listeners
  - Improved uncaught exception management
  - Better error logging with structured JSON format
- **Dashboard**:
  - Tab navigation between "Dashboard" and "Enterprise" views
  - Auto-refresh pauses when viewing Enterprise tab
  - Historical data now loaded from persistent storage
- **Dependencies**:
  - Added `better-sqlite3@^12.6.2` for SQLite support
  - Added `@types/better-sqlite3@^7.6.13` for TypeScript types

### Fixed
- **Windows Build**: Improved `better-sqlite3` build support on Windows environments
- **Dashboard Build**: Fixed Vite build errors in multi-stage Docker builds
- **Data Loss**: Resolved "budget reset on restart" issue with persistent storage
- **Audit History**: Audit logs now survive server restarts (previously in-memory only)

### Security
- No new vulnerabilities introduced
- All dependencies scanned and up-to-date
- Non-root Docker user maintained (sentinel:1001)

### Documentation
- Updated [README.md](README.md) to v0.3.0
- Added [RELEASE_NOTES_v0.3.0.md](RELEASE_NOTES_v0.3.0.md)
- Updated [UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md)
- Synchronized [docs/INTERNAL_ROADMAP.md](docs/INTERNAL_ROADMAP.md)

## [0.2.0] - 2026-02-02

### Added
- **Web Dashboard**:
  - Real-time budget tracking with visual progress bars
  - Live audit log stream with auto-refresh (5s interval)
  - Per-user statistics display
  - One-click budget reset functionality
  - Responsive dark theme design
- **Docker Support**:
  - Multi-stage Dockerfile for minimal image size (~100MB)
  - Non-root user execution (sentinel:1001)
  - Health checks (30s interval)
  - docker-compose.yml for easy deployment
  - .dockerignore for optimized builds
- **CLI Tool**:
  - `yigcore-sentinel start/stop/status` commands
  - Daemon mode with PID tracking
  - Configurable port, budget, rate limits, log levels
  - Graceful shutdown handling
- **API Enhancements**:
  - `/dashboard/` endpoint serving static React app
  - `/health` endpoint with dashboard availability flag
  - Enhanced `/governance/audit` with filtering
  - `/governance/stats` for budget and rate limit metrics
- **Production Features**:
  - Environment configuration via .env file
  - Kubernetes deployment manifests
  - systemd service file
  - Comprehensive deployment guides

### Changed
- Server now serves static dashboard files via `@fastify/static`
- Enhanced health check with component status
- Improved error responses with detailed messages
- Better logging structure (JSON format)

### Fixed
- API CORS configuration for dashboard access
- Port binding issues in Docker
- Graceful shutdown timeout handling

### Documentation
- Added [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- Added [RELEASE_NOTES_v0.2.0.md](RELEASE_NOTES_v0.2.0.md)
- Updated [README.md](README.md) with dashboard instructions
- Added [.env.example](.env.example) configuration template

## [0.1.0] - 2026-01-XX

### Added
- **Core Governance Features**:
  - Budget Guard - Per-user budget tracking and enforcement
  - Policy Engine - Rule-based action governance
  - Rate Limiter - Token bucket algorithm for rate limiting
  - Audit Logger - Structured JSON logging of all governance decisions
- **HTTP REST API**:
  - `POST /governance/check` - Main governance endpoint
  - `GET /governance/audit` - Query audit logs
  - `GET /governance/stats` - Get user statistics
  - `POST /governance/budget/reset` - Reset user budget
- **Python SDK** (`python/`):
  - `@governed` decorator for function governance
  - `init_sentinel()` client initialization
  - Context extraction support
  - Type hints and docstrings
- **Policy Configuration**:
  - JSON-based policy files
  - Wildcard action matching (`delete_*`)
  - Contextual conditions (pathPattern, userPattern, costThreshold)
  - Default effect (allow/deny/warn)
- **Architecture**:
  - Fastify-based HTTP server
  - TypeScript implementation
  - Modular design (BudgetGuard, PolicyEngine, RateLimiter, AuditLogger)
  - Zod schema validation

### Security
- Input validation with Zod schemas
- CORS support via `@fastify/cors`
- Type-safe TypeScript implementation
- Fail-open strategy (configurable)

### Documentation
- [README.md](README.md) - Project overview and quick start
- [docs/API.md](docs/API.md) - Complete API reference
- [docs/POLICY_EXAMPLES.md](docs/POLICY_EXAMPLES.md) - Real-world policy examples
- [examples/](examples/) - Integration examples

---

## Release Links

- [Unreleased]: https://github.com/Henghenggao/yigcore-sentinel/compare/v0.3.0...HEAD
- [0.3.0]: https://github.com/Henghenggao/yigcore-sentinel/compare/v0.2.0...v0.3.0
- [0.2.0]: https://github.com/Henghenggao/yigcore-sentinel/compare/v0.1.0...v0.2.0
- [0.1.0]: https://github.com/Henghenggao/yigcore-sentinel/releases/tag/v0.1.0

---

*For detailed release notes, see individual RELEASE_NOTES files in the project root.*
