-- Add rejection_reason column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT; 