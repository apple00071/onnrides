-- CreateTable
CREATE TABLE "booking_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_history_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "booking_history"
    ADD CONSTRAINT "booking_history_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for faster lookups
CREATE INDEX "idx_booking_history_booking_id" ON "booking_history"("booking_id");
CREATE INDEX "idx_booking_history_created_at" ON "booking_history"("created_at"); 