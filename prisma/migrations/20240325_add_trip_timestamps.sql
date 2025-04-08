-- Add trip timestamp columns to bookings table
ALTER TABLE "bookings" 
ADD COLUMN IF NOT EXISTS "trip_started_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trip_ended_at" TIMESTAMP(6);

-- Create indexes for the new columns to improve query performance
CREATE INDEX IF NOT EXISTS "idx_bookings_trip_timestamps" ON "bookings" ("trip_started_at", "trip_ended_at"); 