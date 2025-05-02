-- Rename columns in bookings table
ALTER TABLE "bookings" RENAME COLUMN "start_date" TO "pickup_time";
ALTER TABLE "bookings" RENAME COLUMN "end_date" TO "dropoff_time"; 