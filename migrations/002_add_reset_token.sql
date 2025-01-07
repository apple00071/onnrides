-- Add reset token fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role); 