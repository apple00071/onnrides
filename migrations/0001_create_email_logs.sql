-- Create email_logs table
DO $$ 
BEGIN
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        booking_id TEXT,
        status VARCHAR(50) NOT NULL,
        error TEXT,
        message_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add index on booking_id for faster lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'email_logs' 
        AND indexname = 'idx_email_logs_booking_id'
    ) THEN
        CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);
    END IF;

    -- Add index on created_at for faster sorting and date-based queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'email_logs' 
        AND indexname = 'idx_email_logs_created_at'
    ) THEN
        CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
    END IF;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating email_logs table: %', SQLERRM;
        RAISE;
END $$; 