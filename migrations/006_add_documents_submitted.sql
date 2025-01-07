-- Add documents_submitted column to users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'documents_submitted') THEN
        ALTER TABLE users ADD COLUMN documents_submitted BOOLEAN DEFAULT false;
    END IF;
END $$; 