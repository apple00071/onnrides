-- Create whatsapp_logs table
DO $$ 
BEGIN
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        booking_id TEXT,
        status VARCHAR(50) NOT NULL,
        error TEXT,
        message_type VARCHAR(50) NOT NULL,
        chat_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add index on booking_id for faster lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'whatsapp_logs' 
        AND indexname = 'idx_whatsapp_logs_booking_id'
    ) THEN
        CREATE INDEX idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
    END IF;

    -- Add index on created_at for faster sorting and date-based queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'whatsapp_logs' 
        AND indexname = 'idx_whatsapp_logs_created_at'
    ) THEN
        CREATE INDEX idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC);
    END IF;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating whatsapp_logs table: %', SQLERRM;
        RAISE;
END $$; 