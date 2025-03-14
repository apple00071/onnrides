import { query } from '@/lib/db';
import logger from '@/lib/logger';

async function fixWhatsAppLogs() {
    try {
        // Drop existing table
        await query('DROP TABLE IF EXISTS whatsapp_logs CASCADE');
        
        // Create table with correct schema - note the id is now gen_random_uuid()
        await query(`
            CREATE TABLE whatsapp_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                recipient TEXT NOT NULL,
                message TEXT NOT NULL,
                booking_id TEXT,  -- This is TEXT type to handle any format
                status TEXT NOT NULL,
                error TEXT,
                message_type TEXT NOT NULL,
                chat_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indices
        await query(`
            CREATE INDEX idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
            CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status);
            CREATE INDEX idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
        `);

        logger.info('WhatsApp logs table fixed successfully');
    } catch (error) {
        logger.error('Error fixing WhatsApp logs table:', error);
        throw error;
    }
}

// Run migrations
fixWhatsAppLogs().then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
}).catch(error => {
    logger.error('Migration failed:', error);
    process.exit(1);
}); 