import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

async function runMigrations() {
    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync(
            path.join(__dirname, 'whatsapp_tables.sql'),
            'utf8'
        );

        // Split the SQL content into individual statements
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Execute each statement
        for (const statement of statements) {
            try {
                await query(statement);
                logger.info('Successfully executed migration:', {
                    statement: statement.substring(0, 100) + '...'
                });
            } catch (error) {
                logger.error('Error executing migration statement:', {
                    error,
                    statement: statement.substring(0, 100) + '...'
                });
                throw error;
            }
        }

        logger.info('All migrations completed successfully');
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migrations
runMigrations(); 