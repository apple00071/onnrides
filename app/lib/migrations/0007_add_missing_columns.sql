-- Add missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT; 