-- Add is_blocked column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Update existing records to have default value
UPDATE profiles 
SET is_blocked = FALSE 
WHERE is_blocked IS NULL; 