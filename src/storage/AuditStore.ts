/**
 * Audit Store Interface
 */

import { type AuditLogEntry } from '../audit_logger';

export interface AuditLogFilter {
    userId?: string;
    action?: string;
    effect?: 'allow' | 'deny' | 'warn';
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
}

export interface AuditStore {
    /**
     * Persist a single audit log entry
     */
    log(entry: AuditLogEntry): Promise<void> | void;

    /**
     * Query recent audit logs with filters
     */
    query(filter: AuditLogFilter): Promise<AuditLogEntry[]> | AuditLogEntry[];

    /**
     * Close connection
     */
    close(): Promise<void> | void;
}
