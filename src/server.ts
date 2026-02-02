/**
 * Yigcore Sentinel - Governance Sidecar Server
 *
 * Provides HTTP API for AI agent governance:
 * - Budget control
 * - Policy enforcement
 * - Rate limiting
 * - Audit logging
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { BudgetGuard } from './budget_guard';
import { StructuredAuditLogger } from './audit_logger';
import { PolicyEngine, createDefaultPolicy, type PolicyConfig } from './policy_lite';
import { TokenBucket } from './rate_limiter';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SQLiteAuditStore } from './storage/SQLiteAuditStore';
import { BudgetPersistence } from './storage/BudgetPersistence';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Enable CORS
server.register(cors, {
  origin: true, // Allow all origins in development
});

// Serve dashboard if available
const dashboardPath = join(process.cwd(), 'dashboard', 'dist');
const dashboardExists = existsSync(dashboardPath);

if (dashboardExists) {
  server.register(fastifyStatic, {
    root: dashboardPath,
    prefix: '/dashboard/',
  });

  server.log.info(`📊 Dashboard available at /dashboard/`);
}

// Initialize persistence
const budgetPersistence = new BudgetPersistence();
const auditStore = new SQLiteAuditStore();

// Initialize governance components
const budgetGuard = new BudgetGuard(parseFloat(process.env.DEFAULT_BUDGET || '10.0'));

// Load persisted budget
const savedBudgets = budgetPersistence.load();
budgetGuard.restoreUsage(savedBudgets);
server.log.info(`💰 Restored budget usage for ${Object.keys(savedBudgets).length} users`);

// Auto-save budget usage every 60s
setInterval(() => {
  budgetPersistence.save(Object.fromEntries(budgetGuard.getUsageMap()));
}, 60000);

// Close resources on shutdown
const cleanup = () => {
  budgetPersistence.save(Object.fromEntries(budgetGuard.getUsageMap()));
  auditStore.close();
};

const auditLogger = new StructuredAuditLogger({
  retainInMemory: true,
  store: auditStore,
  sink: (entry) => {
    // Log to console as well
    server.log.debug({ audit: entry });
  },
});

// Load policy configuration
function loadPolicyConfig(): PolicyConfig {
  const policyPath = process.env.POLICY_PATH || join(process.cwd(), 'policy.json');
  try {
    const content = readFileSync(policyPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    server.log.warn(`Failed to load policy from ${policyPath}, using defaults`);
    return createDefaultPolicy();
  }
}

const policyEngine = new PolicyEngine(loadPolicyConfig());

// Rate limiters per user
const rateLimiters = new Map<string, TokenBucket>();

function getRateLimiter(userId: string): TokenBucket {
  if (!rateLimiters.has(userId)) {
    const capacity = parseInt(process.env.RATE_LIMIT_CAPACITY || '100', 10);
    const refillRate = parseInt(process.env.RATE_LIMIT_REFILL_RATE || '10', 10);
    rateLimiters.set(userId, new TokenBucket({ capacity, refillRate }));
  }
  return rateLimiters.get(userId)!;
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /governance/check
 *
 * Check if an action is allowed.
 *
 * Request body:
 * {
 *   "userId": "agent_123",
 *   "action": "delete_file",
 *   "context": { "path": "/tmp/test.txt" },
 *   "costEstimate": 0.01
 * }
 *
 * Response:
 * {
 *   "allowed": true,
 *   "reasons": [],
 *   "warnings": []
 * }
 */
server.post<{
  Body: {
    userId: string;
    action: string;
    context?: Record<string, any>;
    costEstimate?: number;
  };
}>('/governance/check', async (request, reply) => {
  const { userId, action, context = {}, costEstimate } = request.body;

  const result = {
    allowed: true,
    reasons: [] as string[],
    warnings: [] as string[],
  };

  // 1. Rate limiting check
  const rateLimiter = getRateLimiter(userId);
  if (!rateLimiter.tryConsume(1)) {
    result.allowed = false;
    result.reasons.push('Rate limit exceeded');

    auditLogger.logGovernance({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      action,
      reason: 'rate_limit',
      details: { rateLimitStats: rateLimiter.stats() },
    });

    return reply.code(200).send(result);
  }

  // 2. Budget check
  if (costEstimate !== undefined && !budgetGuard.check(userId, costEstimate)) {
    result.allowed = false;
    result.reasons.push(`Budget exceeded (used: $${budgetGuard.getUsage(userId).toFixed(2)}, limit: $${budgetGuard.getLimit(userId).toFixed(2)})`);

    auditLogger.logGovernance({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      action,
      reason: 'budget_exceeded',
      details: {
        costEstimate,
        currentUsage: budgetGuard.getUsage(userId),
        limit: budgetGuard.getLimit(userId),
      },
    });

    return reply.code(200).send(result);
  }

  // 3. Policy check
  const policyDecision = policyEngine.evaluate(action, { ...context, userId });

  if (policyDecision.effect === 'deny') {
    result.allowed = false;
    result.reasons.push(policyDecision.reason || `Policy violation: ${policyDecision.matchedRule?.id}`);

    auditLogger.logGovernance({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      action,
      reason: 'policy_violation',
      details: {
        matchedRule: policyDecision.matchedRule?.id,
        policyReason: policyDecision.reason,
        context,
      },
    });
  } else if (policyDecision.effect === 'warn') {
    result.warnings.push(policyDecision.reason || `Warning: ${policyDecision.matchedRule?.id}`);

    auditLogger.logGovernance({
      type: 'governance_warning',
      timestamp: Date.now(),
      agentId: userId,
      action,
      reason: 'policy_warning',
      details: {
        matchedRule: policyDecision.matchedRule?.id,
        policyReason: policyDecision.reason,
        context,
      },
    });
  }

  // 4. If allowed, deduct budget and log success
  if (result.allowed && costEstimate !== undefined) {
    budgetGuard.deduct(userId, costEstimate);

    auditLogger.logGovernance({
      type: 'governance_allow',
      timestamp: Date.now(),
      agentId: userId,
      action,
      details: {
        costEstimate,
        newUsage: budgetGuard.getUsage(userId),
        context,
      },
    });
  }

  return reply.code(200).send(result);
});

/**
 * GET /governance/audit
 *
 * Query audit logs.
 *
 * Query params:
 * - userId?: string
 * - limit?: number (default 100)
 */
server.get<{
  Querystring: {
    userId?: string;
    limit?: string;
  };
}>('/governance/audit', async (request, reply) => {
  const { userId, limit = '100' } = request.query;
  const limitNum = parseInt(limit, 10);

  let logs = auditLogger.getRecentEntries(limitNum);

  // Filter by userId if specified
  if (userId) {
    logs = logs.filter((entry) => {
      return 'agentId' in entry && entry.agentId === userId;
    });
  }

  return reply.send({ logs });
});

/**
 * GET /governance/stats
 *
 * Get governance statistics for a user.
 */
server.get<{
  Querystring: {
    userId: string;
  };
}>('/governance/stats', async (request, reply) => {
  const { userId } = request.query;

  if (!userId) {
    return reply.code(400).send({ error: 'userId is required' });
  }

  const rateLimiter = getRateLimiter(userId);

  return reply.send({
    userId,
    budget: {
      used: budgetGuard.getUsage(userId),
      limit: budgetGuard.getLimit(userId),
      remaining: budgetGuard.getLimit(userId) - budgetGuard.getUsage(userId),
    },
    rateLimit: rateLimiter.stats(),
  });
});

/**
 * POST /governance/budget/set
 *
 * Set budget limit for a user.
 */
server.post<{
  Body: {
    userId: string;
    limit: number;
  };
}>('/governance/budget/set', async (request, reply) => {
  const { userId, limit } = request.body;

  if (!userId || limit === undefined) {
    return reply.code(400).send({ error: 'userId and limit are required' });
  }

  budgetGuard.setLimit(userId, limit);

  return reply.send({ success: true, userId, limit });
});

/**
 * POST /governance/budget/reset
 *
 * Reset budget usage for a user.
 */
server.post<{
  Body: {
    userId: string;
  };
}>('/governance/budget/reset', async (request, reply) => {
  const { userId } = request.body;

  if (!userId) {
    return reply.code(400).send({ error: 'userId is required' });
  }

  budgetGuard.reset(userId);

  return reply.send({ success: true, userId });
});

/**
 * GET /health
 *
 * Health check endpoint.
 */
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    version: '0.3.0',
    dashboardAvailable: dashboardExists,
  };
});

/**
 * GET /
 *
 * Root endpoint with API documentation.
 */
server.get('/', async () => {
  return {
    name: 'Yigcore Sentinel',
    version: '0.3.0',
    description: 'Lightweight governance layer for AI agents',
    endpoints: {
      'POST /governance/check': 'Check if an action is allowed',
      'GET /governance/audit': 'Query audit logs',
      'GET /governance/stats': 'Get governance statistics',
      'POST /governance/budget/set': 'Set budget limit',
      'POST /governance/budget/reset': 'Reset budget usage',
      'GET /health': 'Health check',
      'GET /dashboard/': 'Web dashboard (if built)',
    },
    documentation: 'https://github.com/Henghenggao/yigcore-sentinel',
  };
});

// ============================================================================
// Server startup
// ============================================================================

const PORT = parseInt(process.env.PORT || '11435', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 Yigcore Sentinel running on http://${HOST}:${PORT}`);
    server.log.info(`📋 Default budget: $${budgetGuard.getLimit('default')}/user`);
    server.log.info(`⚡ Rate limit: ${rateLimiters.size === 0 ? 'Not initialized' : 'Active'}`);
    server.log.info(`📜 Policy: ${policyEngine.getPolicy().rules.length} rules loaded`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// ============================================================================
// Graceful shutdown handling
// ============================================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    server.log.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  server.log.info(`Received ${signal}, shutting down gracefully...`);

  // Set shutdown timeout (10 seconds)
  const shutdownTimeout = setTimeout(() => {
    server.log.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);

  try {
    // Stop accepting new connections
    await server.close();

    // Flush data
    cleanup();
    server.log.info('💾 Data persisted successfully');

    // Flush audit logs (if needed)
    server.log.info('✅ Server closed successfully');
    server.log.info(`📊 Final stats: ${rateLimiters.size} active users`);

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    server.log.error({ error }, 'Error during shutdown');
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Handle various shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  server.log.error({ error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  server.log.error({ reason, promise }, 'Unhandled rejection');
  gracefulShutdown('unhandledRejection');
});

start();
