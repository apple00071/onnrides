-- CreateTable
CREATE TABLE "public"."vehicle_returns" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "condition_notes" TEXT,
    "damages" JSONB,
    "additional_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "odometer_reading" DOUBLE PRECISION,
    "fuel_level" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_returns_booking_id_key" ON "public"."vehicle_returns"("booking_id");

-- AddForeignKey
ALTER TABLE "public"."vehicle_returns" ADD CONSTRAINT "vehicle_returns_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_returns" ADD CONSTRAINT "vehicle_returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
