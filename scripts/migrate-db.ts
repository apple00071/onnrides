import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function runMigration() {
    try {
        logger.info('Starting database migration...');
        
        // Read the migration file
        const migrationPath = resolve(__dirname, '../migrations/email_logs.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await query(migrationSQL);
        
        logger.info('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration().catch(error => {
        logger.error('Script error:', error);
        process.exit(1);
    });
} 