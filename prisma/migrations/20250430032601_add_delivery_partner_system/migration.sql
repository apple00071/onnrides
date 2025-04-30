-- CreateTable
CREATE TABLE "DeliveryPartner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "vehicle_number" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "current_location" JSONB,
    "rating" REAL NOT NULL DEFAULT 0,
    "total_trips" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryBooking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_partner_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "pickup_location" JSONB NOT NULL,
    "dropoff_location" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimated_distance" REAL NOT NULL,
    "estimated_duration" INTEGER NOT NULL,
    "actual_duration" INTEGER,
    "price" REAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTracking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_booking_id" UUID NOT NULL,
    "location" JSONB NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DeliveryTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_delivery_partner_availability" ON "DeliveryPartner"("is_available");

-- CreateIndex
CREATE INDEX "idx_delivery_partner_rating" ON "DeliveryPartner"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBooking_booking_id_key" ON "DeliveryBooking"("booking_id");

-- CreateIndex
CREATE INDEX "idx_delivery_booking_status" ON "DeliveryBooking"("status");

-- CreateIndex
CREATE INDEX "idx_delivery_booking_partner" ON "DeliveryBooking"("delivery_partner_id");

-- CreateIndex
CREATE INDEX "idx_delivery_booking_booking" ON "DeliveryBooking"("booking_id");

-- CreateIndex
CREATE INDEX "idx_delivery_tracking_booking_time" ON "DeliveryTracking"("delivery_booking_id", "timestamp");

-- AddForeignKey
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryBooking" ADD CONSTRAINT "DeliveryBooking_delivery_partner_id_fkey" FOREIGN KEY ("delivery_partner_id") REFERENCES "DeliveryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryBooking" ADD CONSTRAINT "DeliveryBooking_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_delivery_booking_id_fkey" FOREIGN KEY ("delivery_booking_id") REFERENCES "DeliveryBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
