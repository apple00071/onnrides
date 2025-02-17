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