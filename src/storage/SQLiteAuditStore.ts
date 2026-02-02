/**
 * SQLite implementation of AuditStore
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { type AuditStore, type AuditLogFilter } from './AuditStore';
import { type AuditLogEntry } from '../audit_logger';

export class SQLiteAuditStore implements AuditStore {
    private db: Database.Database;

    constructor(options: { dbPath?: string } = {}) {
        const dbPath = options.dbPath || join(process.cwd(), 'audit.db');

        // Ensure directory exists
        const dir = join(dbPath, '..');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        action TEXT,
        reason TEXT,
        details TEXT -- JSON string
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_id ON audit_logs(agent_id);
    `);
    }

    log(entry: AuditLogEntry): void {
        const stmt = this.db.prepare(`
      INSERT INTO audit_logs (timestamp, agent_id, type, action, reason, details)
      VALUES (@timestamp, @agentId, @type, @action, @reason, @details)
    `);

        // Extract agentId regardless of whether it's on top level or details
        const agentId = 'agentId' in entry ? entry.agentId : 'unknown';
        const action = 'action' in entry ? entry.action : null;
        const reason = 'reason' in entry ? entry.reason : null;
        const details = 'details' in entry ? JSON.stringify(entry.details) : null;

        stmt.run({
            timestamp: entry.timestamp,
            agentId,
            type: entry.type,
            action,
            reason,
            details
        });
    }

    query(filter: AuditLogFilter): AuditLogEntry[] {
        let query = `SELECT * FROM audit_logs WHERE 1=1`;
        const params: any[] = [];

        if (filter.userId) {
            query += ` AND agent_id = ?`;
            params.push(filter.userId);
        }

        if (filter.action) {
            query += ` AND action = ?`;
            params.push(filter.action);
        }

        if (filter.startTime) {
            query += ` AND timestamp >= ?`;
            params.push(filter.startTime);
        }

        if (filter.endTime) {
            query += ` AND timestamp <= ?`;
            params.push(filter.endTime);
        }

        query += ` ORDER BY timestamp DESC LIMIT ?`;
        params.push(filter.limit || 100);

        if (filter.offset) {
            query += ` OFFSET ?`;
            params.push(filter.offset);
        }

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map(row => {
            const entry: any = {
                type: row.type,
                timestamp: row.timestamp,
                agentId: row.agent_id,
            };

            if (row.action) entry.action = row.action;
            if (row.reason) entry.reason = row.reason;
            if (row.details) {
                try {
                    entry.details = JSON.parse(row.details);
                } catch (e) {
                    entry.details = {};
                }
            }

            return entry as AuditLogEntry;
        });
    }

    close(): void {
        this.db.close();
    }
}
