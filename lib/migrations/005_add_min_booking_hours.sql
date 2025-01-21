-- Add min_booking_hours column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12; 