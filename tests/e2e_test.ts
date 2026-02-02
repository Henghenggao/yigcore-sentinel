
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const API_BASE = 'http://localhost:11435';
const DB_PATH = join(process.cwd(), 'audit.db');
const BUDGET_PATH = join(process.cwd(), 'budget.json');

async function runE2E() {
    console.log('🚀 Starting Full E2E Test...');

    // Clean up previous data
    if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    if (existsSync(BUDGET_PATH)) unlinkSync(BUDGET_PATH);

    let serverProcess: ChildProcess | null = null;

    const startServer = () => {
        return new Promise<void>((resolve, reject) => {
            console.log('   Starting Sentinel Server...');
            // Use built server for faster start
            serverProcess = spawn('node', ['dist/server.js'], {
                env: { ...process.env, PORT: '11435', LOG_LEVEL: 'info' },
                stdio: 'pipe',
                shell: true
            });

            const timeout = setTimeout(() => {
                if (serverProcess) (serverProcess as ChildProcess).kill('SIGKILL');
                reject(new Error('Server start timeout'));
            }, 30000);

            // Poll /health endpoint
            const pollHealth = async () => {
                while (true) {
                    try {
                        const res = await axios.get('http://localhost:11435/health');
                        if (res.status === 200) {
                            clearTimeout(timeout);
                            resolve();
                            return;
                        }
                    } catch (e) {
                        // wait and retry
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
            };
            pollHealth();

            serverProcess.stdout?.on('data', (data) => {
                // Keep for debugging if needed
            });

            serverProcess.stderr?.on('data', (data) => {
                const str = data.toString();
                if (str.includes('EADDRINUSE')) {
                    clearTimeout(timeout);
                    reject(new Error('Port 11435 already in use'));
                }
            });

            serverProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    };

    const stopServer = async () => {
        console.log('   Stopping Sentinel Server...');
        if (serverProcess) {
            const proc = serverProcess as ChildProcess;
            // On Windows, taskkill /F /T /PID is often better for cleaning up child processes of shells
            try {
                spawn('taskkill', ['/F', '/T', '/PID', proc.pid!.toString()], { shell: true });
            } catch (e) {
                proc.kill('SIGKILL');
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); // Give it time to release port
        }
    };

    try {
        // 1. Initial Start
        await startServer();
        console.log('   ✅ Server is up.');

        // 2. Perform actions via API
        console.log('   Performing actions...');
        const userId = 'e2e_tester';

        // Action 1: Allowed action with cost
        await axios.post(`${API_BASE}/governance/check`, {
            userId,
            action: 'llm_call',
            costEstimate: 1.50
        });

        // Action 2: Blocked action (e.g. policy)
        await axios.post(`${API_BASE}/governance/check`, {
            userId,
            action: 'delete_file',
            context: { path: '/etc/passwd' }
        });

        // 3. Verify current stats
        const statsBefore = await axios.get(`${API_BASE}/governance/stats?userId=${userId}`);
        console.log(`   Stats before: Used $${statsBefore.data.budget.used}`);
        if (statsBefore.data.budget.used !== 1.5) throw new Error('Budget not deducted correctly');

        // 4. Restart Server
        await stopServer();
        console.log('   Restarting server...');
        await startServer();

        // 5. Verify Persistence
        console.log('   Verifying persistence...');

        // Check Budget
        const statsAfter = await axios.get(`${API_BASE}/governance/stats?userId=${userId}`);
        console.log(`   Stats after: Used $${statsAfter.data.budget.used}`);
        if (statsAfter.data.budget.used !== 1.5) throw new Error('Budget Persistence Failed');

        // Check Audit Logs
        const audit = await axios.get(`${API_BASE}/governance/audit?userId=${userId}`);
        const logs = audit.data.logs;
        console.log(`   Audit logs count: ${logs.length}`);

        const hasBlock = logs.some((l: any) => l.reason === 'policy_violation');
        const hasAllow = logs.some((l: any) => l.action === 'llm_call');

        if (!hasBlock || !hasAllow) throw new Error('Audit Persistence Failed');

        console.log('   ✅ Persistence verified.');

        // 6. Final Cleanup
        await stopServer();
        console.log('\n🎉 E2E Test Passed Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ E2E Test Failed:');
        console.error(err);
        if (serverProcess) (serverProcess as ChildProcess).kill();
        process.exit(1);
    }
}

runE2E();
