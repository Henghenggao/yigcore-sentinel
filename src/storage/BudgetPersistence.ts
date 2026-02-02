/**
 * Budget Persistence
 * Saves and loads budget usage to/from a JSON file.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export class BudgetPersistence {
    private filePath: string;

    constructor(options: { filePath?: string } = {}) {
        this.filePath = options.filePath || join(process.cwd(), 'budget.json');
    }

    save(data: Record<string, number>): void {
        try {
            const json = JSON.stringify(data, null, 2);
            writeFileSync(this.filePath, json, 'utf-8');
        } catch (error) {
            console.error('Failed to save budget data:', error);
        }
    }

    load(): Record<string, number> {
        try {
            if (!existsSync(this.filePath)) {
                return {};
            }
            const json = readFileSync(this.filePath, 'utf-8');
            return JSON.parse(json);
        } catch (error) {
            console.error('Failed to load budget data:', error);
            return {};
        }
    }
}
