/**
 * Simplified audit logger for Sentinel.
 * Logs governance decisions and events.
 */

import { type AuditStore } from './storage/AuditStore';

export interface AuditLogEntry {
  type: string;
  timestamp: number;
  agentId?: string; // Optional because system events might not have an agentId
  action?: string;
  reason?: string;
  details?: Record<string, any>;
  // Legacy fields to support migration or keep compatibility if needed
  roundId?: string;
  taskId?: string;
  providerId?: string;
  model?: string;
  contextSize?: number;
  outputTokens?: number;
  costUsd?: number;
  durationMs?: number;
}

export type LogSink = (entry: AuditLogEntry) => void;

interface AuditLoggerOptions {
  sink?: LogSink;
  retainInMemory?: boolean;
  maxMemoryLogs?: number;
  store?: AuditStore;
}

/**
 * Structured audit logger that outputs entries to a configurable sink.
 * Default sink writes JSON lines to stderr.
 */
export class StructuredAuditLogger {
  private sink?: LogSink;
  private memoryLogs: AuditLogEntry[] = [];
  private retainInMemory: boolean;
  private maxMemoryLogs: number;
  private store?: AuditStore;

  constructor(options: AuditLoggerOptions = {}) {
    this.sink = options.sink ?? defaultSink;
    this.retainInMemory = options.retainInMemory ?? false;
    this.maxMemoryLogs = options.maxMemoryLogs ?? 1000;
    this.store = options.store;
  }

  log(entry: AuditLogEntry) {
    // 1. Send to sink (e.g., console/file)
    if (this.sink) {
      try {
        this.sink(entry);
      } catch {
        // best effort
      }
    }

    // 2. Persist to store (if configured)
    if (this.store) {
      try {
        this.store.log(entry);
      } catch (err) {
        console.error('Failed to log to audit store:', err);
      }
    }

    // 3. Keep in memory (if configured)
    if (this.retainInMemory) {
      this.memoryLogs.unshift(entry);
      if (this.memoryLogs.length > this.maxMemoryLogs) {
        this.memoryLogs.pop();
      }
    }
  }

  logEvent(event: AuditLogEntry): void {
    this.log(event);
  }

  logInference(entry: AuditLogEntry): void {
    this.log(entry);
  }

  logGovernance(entry: AuditLogEntry): void {
    this.log(entry);
  }

  /** Get recent entries (last N). */
  getRecentEntries(limit: number = 100): AuditLogEntry[] {
    // If we have a store, prefer querying it
    if (this.store) {
      try {
        const logs = this.store.query({ limit });
        if (logs instanceof Promise) {
          // Fallback to memory if store is async and we are in sync method
          return this.memoryLogs.slice(0, limit);
        }
        return logs;
      } catch (e) {
        console.error('Failed to query audit store:', e);
        return this.memoryLogs.slice(0, limit);
      }
    }
    return this.memoryLogs.slice(0, limit);
  }

  /**
   * Clear memory logs provided we are retaining them.
   * Does NOT clear persistent store.
   */
  clear(): void {
    this.memoryLogs = [];
  }
}

function defaultSink(entry: AuditLogEntry): void {
  try {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } catch {
    // swallow
  }
}

/**
 * A no-op audit logger for testing or when audit is disabled.
 */
export const nullAuditLogger = {
  log: () => { },
  logEvent: () => { },
  logInference: () => { },
  logGovernance: () => { },
  getRecentEntries: () => [] as const,
  clear: () => { },
};
