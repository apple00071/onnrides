-- Add min_booking_hours column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12; 