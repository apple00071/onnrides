-- Add is_documents_verified column to profiles table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'is_documents_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_documents_verified BOOLEAN DEFAULT false;
    END IF;
END $$; 