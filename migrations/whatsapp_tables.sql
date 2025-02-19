-- Create WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    booking_id TEXT,
    status TEXT NOT NULL,
    error TEXT,
    message_type TEXT NOT NULL,
    chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create email logs table with optimized structure
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    message_content TEXT NOT NULL,
    booking_id TEXT,
    status TEXT NOT NULL,
    error TEXT,
    message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    phone TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_time BIGINT NOT NULL
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);

-- Create indices for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Add status check constraints
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check 
    CHECK (status IN ('pending', 'success', 'failed'));

ALTER TABLE whatsapp_logs ADD CONSTRAINT whatsapp_logs_status_check 
    CHECK (status IN ('pending', 'success', 'failed')); 