# Release Notes - v0.3.0

**Release Date:** 2026-02-02
**Status:** Production Ready 🚀

---

## 🎉 What's New in v0.3.0

### 🛡️ Persistence Layer (SQLite & File)

The most critical addition in v0.3.0 is the **Persistence Layer**, resolving the "data loss on restart" issue.

**Features:**
- ✅ **SQLite Audit Store**: All audit logs are now automatically saved to `audit.db` via `better-sqlite3`. This ensures governance history is preserved for compliance.
- ✅ **Budget Persistence**: User budget usage is now snapshotted to `budget.json` every 60 seconds and on graceful shutdown. Restarting the server no longer resets user quotas.
- ✅ **Graceful Shutdown**: Enhanced signal handling ensures all data is flushed to disk before the process exits.

### 🌐 Enterprise Preview Dashboard

The Web Dashboard has been upgraded to showcase the path to Yigcore's enterprise capabilities.

**New Features:**
- ✅ **Enterprise Tab**: A dedicated view previewing advanced features like Bandit Router and DAG Analytics.
- ✅ **Lead Generation Funnel**: Integrated "Request Demo" workflow for enterprise inquiries.
- ✅ **Persistent History**: Dashboard now displays historical data loaded from the database, not just recent memory.

---

## 🔧 Improvements

- **Refactored AuditLogger**: Cleaned up legacy types and unified the logging interface.
- **Robust E2E Testing**: New end-to-end tests covering server restarts and data verification.
- **Windows Support**: Improved stability for development on Windows environments.

---

## 📦 Breaking Changes

- **Version Bump**: All components updated to v0.3.0.
- **Dependency Added**: Now requires `better-sqlite3` (and Python/build tools for native compilation if not pre-built).

---

## 🚀 Quick Upgrade Guide

### From v0.2.0 to v0.3.0

#### npm/Source Install:
```bash
git pull origin main
npm install             # Install better-sqlite3
npm run build
npm start
```
*Note: If you are on Windows, ensure you have build tools installed or a pre-compiled binary for `better-sqlite3`.*

#### Docker:
```bash
docker pull yigcore-sentinel:latest
docker compose up -d
```
*Note: The Docker image handles the native dependencies automatically.*

---

## 📝 Full Changelog

### Added
- 💾 `src/storage/SQLiteAuditStore.ts`: SQLite backend for audit logs.
- 💾 `src/storage/BudgetPersistence.ts`: JSON file backend for budget state.
- 📊 `EnterpriseTab` component in Dashboard.
- 🧪 `tests/verify_persistence.ts` and `tests/e2e_test.ts`.

### Changed
- 🔄 `src/server.ts`: Integrated persistence initialization and graceful shutdown cleanup.
- 🔄 `src/audit_logger.ts`: Refactored to support `AuditStore` interface.
- 📝 Updated `README.md` and `INTERNAL_ROADMAP.md`.

---

## 🔮 What's Next

We are working towards **v0.4.0**, which will focus on expanding our SDK support, specifically for JavaScript/TypeScript, to align with the LangChain ecosystem.
