#!/usr/bin/env node

/**
 * Yigcore Sentinel CLI
 *
 * Command-line interface for starting/managing the Sentinel governance server
 *
 * Usage:
 *   yigcore-sentinel start [options]
 *   yigcore-sentinel --version
 *   yigcore-sentinel --help
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { homedir, tmpdir } from 'os';

const VERSION = '0.2.0';
const PID_FILE = join(tmpdir(), 'yigcore-sentinel.pid');

interface StartOptions {
  port?: number;
  host?: string;
  budget?: number;
  rateLimit?: number;
  policy?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  daemon?: boolean;
}

function showHelp() {
  console.log(`
Yigcore Sentinel v${VERSION}
Lightweight governance layer for AI agents

USAGE:
  yigcore-sentinel start [options]     Start the Sentinel server
  yigcore-sentinel stop                Stop the running server
  yigcore-sentinel status              Check if server is running
  yigcore-sentinel --version           Show version
  yigcore-sentinel --help              Show this help

START OPTIONS:
  -p, --port <port>           Server port (default: 11435)
  -h, --host <host>           Server host (default: 0.0.0.0)
  -b, --budget <amount>       Default budget per user (default: 10.0)
  -r, --rate-limit <n>        Rate limit capacity (default: 100)
  --policy <path>             Path to policy.json file
  --log-level <level>         Log level: debug, info, warn, error (default: info)
  -d, --daemon                Run as background daemon

EXAMPLES:
  # Start with defaults
  yigcore-sentinel start

  # Start with custom port and budget
  yigcore-sentinel start --port 8080 --budget 50

  # Start as background daemon
  yigcore-sentinel start --daemon

  # Stop daemon
  yigcore-sentinel stop

ENVIRONMENT VARIABLES:
  PORT                   Server port (overridden by --port)
  HOST                   Server host (overridden by --host)
  DEFAULT_BUDGET         Default budget (overridden by --budget)
  RATE_LIMIT_CAPACITY    Rate limit (overridden by --rate-limit)
  POLICY_PATH            Policy file path (overridden by --policy)
  LOG_LEVEL              Log level (overridden by --log-level)

For more information, visit: https://github.com/Henghenggao/yigcore-sentinel
`);
}

function parseArgs(args: string[]): { command: string; options: StartOptions } {
  const command = args[0] || 'start';
  const options: StartOptions = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '-p':
      case '--port':
        options.port = parseInt(next, 10);
        i++;
        break;
      case '-h':
      case '--host':
        options.host = next;
        i++;
        break;
      case '-b':
      case '--budget':
        options.budget = parseFloat(next);
        i++;
        break;
      case '-r':
      case '--rate-limit':
        options.rateLimit = parseInt(next, 10);
        i++;
        break;
      case '--policy':
        options.policy = next;
        i++;
        break;
      case '--log-level':
        options.logLevel = next as any;
        i++;
        break;
      case '-d':
      case '--daemon':
        options.daemon = true;
        break;
    }
  }

  return { command, options };
}

function startServer(options: StartOptions) {
  const env = { ...process.env };

  // Apply CLI options to environment
  if (options.port) env.PORT = options.port.toString();
  if (options.host) env.HOST = options.host;
  if (options.budget) env.DEFAULT_BUDGET = options.budget.toString();
  if (options.rateLimit) env.RATE_LIMIT_CAPACITY = options.rateLimit.toString();
  if (options.policy) env.POLICY_PATH = options.policy;
  if (options.logLevel) env.LOG_LEVEL = options.logLevel;

  const serverPath = join(__dirname, 'server.js');

  if (options.daemon) {
    // Check if already running
    if (existsSync(PID_FILE)) {
      const pid = parseInt(readFileSync(PID_FILE, 'utf-8'), 10);
      try {
        process.kill(pid, 0); // Check if process exists
        console.error(`❌ Sentinel is already running (PID: ${pid})`);
        console.error('   Run "yigcore-sentinel stop" first');
        process.exit(1);
      } catch {
        // Process doesn't exist, remove stale PID file
        unlinkSync(PID_FILE);
      }
    }

    // Start as daemon
    const child = spawn('node', [serverPath], {
      detached: true,
      stdio: 'ignore',
      env,
    });

    child.unref();
    writeFileSync(PID_FILE, child.pid!.toString());

    console.log(`✅ Yigcore Sentinel started in background (PID: ${child.pid})`);
    console.log(`   Port: ${env.PORT || 11435}`);
    console.log(`   Budget: $${env.DEFAULT_BUDGET || 10.0}/user`);
    console.log(`\n   To stop: yigcore-sentinel stop`);
  } else {
    // Start in foreground
    console.log('🚀 Starting Yigcore Sentinel...\n');
    const child = spawn('node', [serverPath], {
      stdio: 'inherit',
      env,
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

function stopServer() {
  if (!existsSync(PID_FILE)) {
    console.error('❌ Sentinel is not running (no PID file found)');
    process.exit(1);
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf-8'), 10);

  try {
    process.kill(pid, 'SIGTERM');
    unlinkSync(PID_FILE);
    console.log(`✅ Sentinel stopped (PID: ${pid})`);
  } catch (error) {
    console.error(`❌ Failed to stop Sentinel (PID: ${pid})`);
    console.error(`   Error: ${(error as Error).message}`);
    console.error(`   You may need to kill it manually: kill ${pid}`);
    process.exit(1);
  }
}

function checkStatus() {
  if (!existsSync(PID_FILE)) {
    console.log('❌ Sentinel is not running');
    process.exit(1);
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf-8'), 10);

  try {
    process.kill(pid, 0); // Check if process exists
    console.log(`✅ Sentinel is running (PID: ${pid})`);

    // Try to fetch health endpoint
    const port = process.env.PORT || 11435;
    console.log(`   Port: ${port}`);
    console.log(`\n   Health check: http://localhost:${port}/health`);
  } catch {
    console.log(`❌ Sentinel is not running (stale PID: ${pid})`);
    unlinkSync(PID_FILE);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);

  // Handle flags
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`v${VERSION}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const { command, options } = parseArgs(args);

  switch (command) {
    case 'start':
      startServer(options);
      break;
    case 'stop':
      stopServer();
      break;
    case 'status':
      checkStatus();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error('   Run "yigcore-sentinel --help" for usage');
      process.exit(1);
  }
}

main();
