-- Add permissions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Create index on permissions for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING gin (permissions);
