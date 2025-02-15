import { config } from 'dotenv';
import { resolve } from 'path';
import { pool, query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function testDatabaseConnection() {
    try {
        logger.info('Testing database connection...');
        logger.info('Using database URL:', process.env.DATABASE_URL?.replace(/:[^:@]{1,}@/, ':****@'));
        
        // Test simple query
        const result = await query('SELECT NOW()');
        logger.info('Database connection successful:', result.rows[0]);
        
        // Test email_logs table
        const tableResult = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'email_logs'
            );
        `);
        
        if (tableResult.rows[0].exists) {
            logger.info('email_logs table exists');
            
            // Get table structure
            const columnsResult = await query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'email_logs'
                ORDER BY ordinal_position;
            `);
            
            logger.info('email_logs table structure:', columnsResult.rows);
        } else {
            logger.error('email_logs table does not exist');
        }
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        logger.error('Database connection test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testDatabaseConnection().catch(error => {
        logger.error('Script error:', error);
        process.exit(1);
    });
}

export default testDatabaseConnection; 