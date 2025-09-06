-- Remove unnecessary columns
ALTER TABLE "bookings"
DROP COLUMN IF EXISTS "purpose_of_rent",
DROP COLUMN IF EXISTS "original_dl_verified",
DROP COLUMN IF EXISTS "voter_id_verified"; 