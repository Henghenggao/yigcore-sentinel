
import { BudgetPersistence } from '../src/storage/BudgetPersistence';
import { SQLiteAuditStore } from '../src/storage/SQLiteAuditStore';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

async function verifyPersistence() {
    console.log('🧪 Starting Persistence Verification...');

    // 1. Verify Budget Persistence
    console.log('\n[1] Testing Budget Persistence...');
    const budgetPath = join(process.cwd(), 'test_budget.json');
    if (existsSync(budgetPath)) unlinkSync(budgetPath);

    const budgetStore = new BudgetPersistence({ filePath: budgetPath });
    const testData = { 'user_1': 5.5, 'user_2': 10.0 };

    console.log('   Saving budget data...');
    budgetStore.save(testData);

    console.log('   Loading budget data...');
    const loadedData = budgetStore.load();

    if (loadedData['user_1'] === 5.5 && loadedData['user_2'] === 10.0) {
        console.log('   ✅ Budget persistence passed!');
    } else {
        console.error('   ❌ Budget persistence failed!', loadedData);
        process.exit(1);
    }

    // Clean up
    if (existsSync(budgetPath)) unlinkSync(budgetPath);

    // 2. Verify SQLite Audit Store
    console.log('\n[2] Testing SQLite Audit Store...');
    const dbPath = join(process.cwd(), 'test_audit.db');
    if (existsSync(dbPath)) unlinkSync(dbPath);

    const auditStore = new SQLiteAuditStore({ dbPath });

    const entry = {
        type: 'governance_allow',
        timestamp: Date.now(),
        agentId: 'test_agent',
        action: 'delete_file',
        details: { path: '/tmp/test' }
    };

    console.log('   Logging audit entry...');
    auditStore.log(entry);

    console.log('   Querying audit entry...');
    const logs = auditStore.query({ userId: 'test_agent', limit: 1 });

    if (logs.length === 1 && logs[0].agentId === 'test_agent' && logs[0].action === 'delete_file') {
        console.log('   ✅ SQLite persistence passed!');
    } else {
        console.error('   ❌ SQLite persistence failed!', logs);
        process.exit(1);
    }

    auditStore.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);

    console.log('\n🎉 All verifications passed!');
}

verifyPersistence().catch(err => {
    console.error(err);
    process.exit(1);
});
