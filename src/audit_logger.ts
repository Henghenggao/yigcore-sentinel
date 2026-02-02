/**
 * Simplified audit logger for Sentinel.
 * Logs governance decisions and events.
 */

export interface AuditEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  details?: Record<string, any>;
}

export interface InferenceAuditEntry {
  type: 'inference';
  timestamp: number;
  roundId?: string;
  taskId?: string;
  agentId: string;
  providerId: string;
  model: string;
  contextSize: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  status: 'success' | 'error';
  error?: string;
}

export interface GovernanceAuditEntry {
  type: 'governance_allow' | 'governance_block' | 'governance_warning';
  timestamp: number;
  agentId: string;
  action: string;
  reason?: string;
  details?: Record<string, any>;
}

export type StructuredAuditEntry = InferenceAuditEntry | GovernanceAuditEntry | AuditEvent;

export type AuditSink = (entry: StructuredAuditEntry) => void;

/**
 * Structured audit logger that outputs entries to a configurable sink.
 * Default sink writes JSON lines to stderr.
 */
export class StructuredAuditLogger {
  private readonly sink: AuditSink;
  private readonly entries: StructuredAuditEntry[] = [];
  private readonly retainInMemory: boolean;

  constructor(options?: { sink?: AuditSink; retainInMemory?: boolean }) {
    this.sink = options?.sink ?? defaultSink;
    this.retainInMemory = options?.retainInMemory ?? false;
  }

  logEvent(event: AuditEvent): void {
    this.emit(event);
  }

  logInference(entry: InferenceAuditEntry): void {
    this.emit(entry);
  }

  logGovernance(entry: GovernanceAuditEntry): void {
    this.emit(entry);
  }

  /** Get retained entries (only if retainInMemory was true). */
  getEntries(): readonly StructuredAuditEntry[] {
    return this.entries;
  }

  /** Get recent entries (last N). */
  getRecentEntries(limit: number = 100): readonly StructuredAuditEntry[] {
    return this.entries.slice(-limit);
  }

  /** Clear retained entries. */
  clear(): void {
    this.entries.length = 0;
  }

  private emit(entry: StructuredAuditEntry): void {
    if (this.retainInMemory) {
      this.entries.push(entry);
    }
    try {
      this.sink(entry);
    } catch {
      // best-effort — audit logging must not crash the system
    }
  }
}

function defaultSink(entry: StructuredAuditEntry): void {
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
  logEvent: () => {},
  logInference: () => {},
  logGovernance: () => {},
  getEntries: () => [] as const,
  getRecentEntries: () => [] as const,
  clear: () => {},
};
