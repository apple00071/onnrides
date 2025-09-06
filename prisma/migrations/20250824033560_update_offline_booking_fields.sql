-- Add new customer information fields
ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "aadhar_number" TEXT,
ADD COLUMN IF NOT EXISTS "father_number" TEXT,
ADD COLUMN IF NOT EXISTS "mother_number" TEXT,
ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
ADD COLUMN IF NOT EXISTS "rental_amount" DECIMAL(10,2);

-- Rename due_amount to pending_amount
ALTER TABLE "bookings"
RENAME COLUMN "due_amount" TO "pending_amount";

-- Drop agreement_scan column
ALTER TABLE "bookings"
DROP COLUMN IF EXISTS "agreement_scan"; 