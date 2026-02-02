import { useEffect, useState } from 'react';
import { sentinelAPI } from './api/sentinel';
import type { AuditLogEntry, HealthStatus, UserStats } from './types';
import { formatDistanceToNow } from 'date-fns';
import './App.css';

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [userStats, setUserStats] = useState<Map<string, UserStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data
  const fetchData = async () => {
    try {
      setError(null);

      // Fetch health
      const healthData = await sentinelAPI.getHealth();
      setHealth(healthData);

      // Fetch audit logs
      const logsData = await sentinelAPI.getAuditLogs({ limit: 50 });
      setAuditLogs(logsData.logs);

      // Extract unique user IDs from logs
      const userIds = new Set(
        logsData.logs
          .filter((log) => 'agentId' in log)
          .map((log) => log.agentId)
      );

      // Fetch stats for each user
      const statsMap = new Map<string, UserStats>();
      for (const userId of userIds) {
        try {
          const stats = await sentinelAPI.getUserStats(userId);
          statsMap.set(userId, stats);
        } catch (err) {
          console.error(`Failed to fetch stats for user ${userId}:`, err);
        }
      }
      setUserStats(statsMap);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getBudgetPercentage = (stats: UserStats): number => {
    return (stats.budget.used / stats.budget.limit) * 100;
  };

  const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading Sentinel Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Yigcore Sentinel Dashboard</h1>
        <p className="header-subtitle">Real-time AI Agent Governance Monitor</p>

        {health && (
          <div className={`status-indicator ${health.status}`}>
            <div className="status-dot" />
            <span>
              {health.status === 'ok' ? 'Healthy' : 'Offline'} • v{health.version}
            </span>
          </div>
        )}
      </header>

      {error && <div className="error-message">Error: {error}</div>}

      <div className="controls">
        <button onClick={fetchData}>Refresh Now</button>
        <button onClick={() => setAutoRefresh(!autoRefresh)}>
          Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* User Stats */}
      <h2>Active Users</h2>
      <div className="grid">
        {Array.from(userStats.entries()).map(([userId, stats]) => {
          const budgetPercentage = getBudgetPercentage(stats);
          const rateLimitPercentage =
            (stats.rateLimit.available / stats.rateLimit.capacity) * 100;

          return (
            <div key={userId} className="card">
              <div className="card-header">{userId}</div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Budget: ${stats.budget.used.toFixed(2)} / ${stats.budget.limit.toFixed(2)}
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${getProgressBarClass(budgetPercentage)}`}
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Rate Limit: {stats.rateLimit.available} / {stats.rateLimit.capacity} tokens
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${getProgressBarClass(100 - rateLimitPercentage)}`}
                    style={{ width: `${rateLimitPercentage}%` }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={async () => {
                    if (confirm(`Reset budget for ${userId}?`)) {
                      await sentinelAPI.resetBudget(userId);
                      await fetchData();
                    }
                  }}
                >
                  Reset Budget
                </button>
              </div>
            </div>
          );
        })}

        {userStats.size === 0 && (
          <div className="card">
            <div className="card-description">No active users yet</div>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <h2>Recent Audit Logs</h2>
      <div className="audit-logs">
        {auditLogs.slice(0, 20).map((log, index) => {
          const typeLabel = log.type.replace('governance_', '');

          return (
            <div key={index} className="audit-log-item">
              <div className="audit-log-header">
                <div className={`audit-log-type ${typeLabel}`}>{typeLabel}</div>
                <div className="audit-log-timestamp">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </div>
              </div>

              <div className="audit-log-details">
                <div>
                  <strong>User:</strong> {log.agentId}
                </div>
                <div>
                  <strong>Action:</strong> {log.action}
                </div>
                {log.reason && (
                  <div>
                    <strong>Reason:</strong> {log.reason}
                  </div>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      View details
                    </summary>
                    <pre
                      style={{
                        fontSize: '0.75rem',
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: '0.25rem',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}

        {auditLogs.length === 0 && (
          <div className="card">
            <div className="card-description">No audit logs yet</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
