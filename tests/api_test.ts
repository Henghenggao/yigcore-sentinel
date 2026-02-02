
import axios from 'axios';

const API_BASE = 'http://localhost:11435';

async function test(mode: 'initial' | 'verify') {
    console.log(`🧪 Mode: ${mode}`);
    const userId = 'e2e_tester';

    if (mode === 'initial') {
        // 1. Health check
        const health = await axios.get(`${API_BASE}/health`);
        console.log(`   Health: ${health.data.status} v${health.data.version}`);

        // 2. Perform actions
        console.log('   Performing actions...');
        await axios.post(`${API_BASE}/governance/check`, {
            userId,
            action: 'llm_call',
            costEstimate: 1.50
        });

        await axios.post(`${API_BASE}/governance/check`, {
            userId,
            action: 'delete_file',
            context: { path: '/etc/passwd' }
        });

        const stats = await axios.get(`${API_BASE}/governance/stats?userId=${userId}`);
        console.log(`   Stats: Used $${stats.data.budget.used}`);
        if (stats.data.budget.used !== 1.5) throw new Error('Budget mismatch');
    } else {
        // 1. Verify Persistence
        console.log('   Verifying persistence...');
        const stats = await axios.get(`${API_BASE}/governance/stats?userId=${userId}`);
        console.log(`   Stats after restart: Used $${stats.data.budget.used}`);
        if (stats.data.budget.used !== 1.5) throw new Error('Budget Persistence Failed');

        const audit = await axios.get(`${API_BASE}/governance/audit?userId=${userId}`);
        const logs = audit.data.logs;
        console.log(`   Audit logs: ${logs.length}`);

        const hasBlock = logs.some((l: any) => l.reason === 'policy_violation');
        const hasAllow = logs.some((l: any) => l.type === 'governance_allow' || l.action === 'llm_call');

        if (!hasBlock || !hasAllow) throw new Error('Audit Persistence Failed');
        console.log('   ✅ Persistence verified.');
    }
}

const mode = process.argv[2] as 'initial' | 'verify';
test(mode).catch(err => {
    console.error(err.message);
    if (err.response) console.error(err.response.data);
    process.exit(1);
});
