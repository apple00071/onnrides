-- Add missing profile fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT; 