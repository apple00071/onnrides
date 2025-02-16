-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
    'whatsapp_booking_confirmation',
    'whatsapp_booking_cancellation',
    'whatsapp_payment_confirmation',
    'email_booking_confirmation',
    'email_payment_confirmation',
    'email_document_reminder',
    'email_password_reset'
);

-- Create notification status enum
CREATE TYPE notification_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

-- Create notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    type notification_type NOT NULL,
    recipient TEXT NOT NULL,
    data JSONB NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    retries INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER NOT NULL DEFAULT 0
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry ON notification_queue(next_retry_at)
    WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority DESC, created_at ASC)
    WHERE status = 'pending'; 