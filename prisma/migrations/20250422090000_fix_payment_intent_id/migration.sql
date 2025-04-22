-- Drop existing index and constraint if they exist
DROP INDEX IF EXISTS "idx_bookings_payment_intent_id";
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_payment_intent_id_key";

-- Drop the column if it exists (to avoid errors)
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_intent_id";

-- Add the column fresh
ALTER TABLE "bookings" ADD COLUMN "payment_intent_id" TEXT;

-- Add unique constraint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payment_intent_id_key" UNIQUE ("payment_intent_id");

-- Add index for faster lookups
CREATE INDEX "idx_bookings_payment_intent_id" ON "bookings"("payment_intent_id"); 