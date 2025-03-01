-- Add missing columns if they don't exist
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS booking_id TEXT,
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Create index for booking_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);

-- Add constraint for status values
ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_status_check 
CHECK (status IN ('pending', 'success', 'failed'))
NOT VALID; -- NOT VALID allows existing rows to bypass the check

-- Validate the constraint for future inserts
ALTER TABLE email_logs 
VALIDATE CONSTRAINT email_logs_status_check; 