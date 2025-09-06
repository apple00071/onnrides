-- Add new columns for rental amounts
ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "rental_amount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "pending_amount" DECIMAL(10,2); 