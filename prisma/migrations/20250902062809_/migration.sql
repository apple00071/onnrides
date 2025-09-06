/*
  Warnings:

  - You are about to drop the column `dropoff_location` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_details` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_intent_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_location` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `security_deposit` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `total_hours` on the `bookings` table. All the data in the column will be lost.
  - You are about to alter the column `total_price` on the `bookings` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[booking_id]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Made the column `booking_id` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_price` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `booking_type` on table `bookings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."bookings" DROP CONSTRAINT "bookings_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."vehicle_returns" DROP CONSTRAINT "vehicle_returns_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."vehicle_returns" DROP CONSTRAINT "vehicle_returns_processed_by_fkey";

-- AlterTable
ALTER TABLE "public"."bookings" DROP COLUMN "dropoff_location",
DROP COLUMN "payment_details",
DROP COLUMN "payment_intent_id",
DROP COLUMN "pickup_location",
DROP COLUMN "security_deposit",
DROP COLUMN "total_hours",
ADD COLUMN     "aadhar_number" TEXT,
ADD COLUMN     "aadhar_scan" TEXT,
ADD COLUMN     "alternate_phone" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "dl_expiry_date" TIMESTAMPTZ(6),
ADD COLUMN     "dl_number" TEXT,
ADD COLUMN     "dl_scan" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "father_number" TEXT,
ADD COLUMN     "mother_number" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paid_amount" DECIMAL(10,2),
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_reference" TEXT,
ADD COLUMN     "pending_amount" DECIMAL(10,2),
ADD COLUMN     "permanent_address" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "rental_amount" DECIMAL(10,2),
ADD COLUMN     "security_deposit_amount" DECIMAL(10,2),
ADD COLUMN     "selfie" TEXT,
ADD COLUMN     "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "total_amount" DECIMAL(10,2),
ADD COLUMN     "vehicle_model" TEXT,
ALTER COLUMN "booking_id" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "total_price" SET NOT NULL,
ALTER COLUMN "total_price" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "booking_type" SET NOT NULL,
ALTER COLUMN "booking_type" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "public"."trip_initiations" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "checklist_completed" BOOLEAN NOT NULL DEFAULT false,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "customer_dl_number" VARCHAR(50),
    "customer_address" TEXT,
    "emergency_contact" VARCHAR(20),
    "emergency_name" VARCHAR(255),
    "customer_aadhaar_number" VARCHAR(20),
    "customer_dob" VARCHAR(20),
    "vehicle_number" VARCHAR(50),
    "documents" JSONB NOT NULL DEFAULT '{}',
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_initiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_initiations_booking_id_key" ON "public"."trip_initiations"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_id_key" ON "public"."bookings"("booking_id");

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_returns" ADD CONSTRAINT "vehicle_returns_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_returns" ADD CONSTRAINT "vehicle_returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trip_initiations" ADD CONSTRAINT "trip_initiations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
