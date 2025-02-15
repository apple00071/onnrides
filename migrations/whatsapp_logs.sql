-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_whatsapp_logs_updated_at ON whatsapp_logs;
DROP FUNCTION IF EXISTS update_whatsapp_logs_updated_at();

-- Create WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    error TEXT,
    message_type VARCHAR(50) NOT NULL,
    chat_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
DROP INDEX IF EXISTS idx_whatsapp_logs_recipient;
DROP INDEX IF EXISTS idx_whatsapp_logs_status;
DROP INDEX IF EXISTS idx_whatsapp_logs_created_at;
DROP INDEX IF EXISTS idx_whatsapp_logs_booking_id;

CREATE INDEX idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);
CREATE INDEX idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_logs_updated_at
    BEFORE UPDATE ON whatsapp_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_logs_updated_at(); 