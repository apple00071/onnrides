-- Add payment_intent_id column to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_intent_id" TEXT;

-- Add unique constraint to payment_intent_id
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payment_intent_id_key" UNIQUE ("payment_intent_id");

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_bookings_payment_intent_id" ON "bookings"("payment_intent_id"); 