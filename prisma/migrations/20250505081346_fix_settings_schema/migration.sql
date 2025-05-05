/*
  Warnings:

  - The primary key for the `bookings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `bookingId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `dropoffLocation` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDetails` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLocation` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `totalHours` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `bookings` table. All the data in the column will be lost.
  - The primary key for the `email_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `bookingId` on the `email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `message_content` on the `email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `message_id` on the `email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `settings` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isBlocked` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - The primary key for the `vehicles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `brand` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `licensePlate` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `minBookingHours` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerHour` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `vehicles` table. All the data in the column will be lost.
  - Added the required column `end_date` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `body` to the `email_logs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `email_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `price_per_hour` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `vehicles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_vehicleId_fkey";

-- DropIndex
DROP INDEX "bookings_bookingId_key";

-- AlterTable
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pkey",
DROP COLUMN "bookingId",
DROP COLUMN "createdAt",
DROP COLUMN "dropoffLocation",
DROP COLUMN "endDate",
DROP COLUMN "notes",
DROP COLUMN "paymentDetails",
DROP COLUMN "paymentStatus",
DROP COLUMN "pickupLocation",
DROP COLUMN "startDate",
DROP COLUMN "totalHours",
DROP COLUMN "totalPrice",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
DROP COLUMN "vehicleId",
ADD COLUMN     "booking_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dropoff_location" JSONB,
ADD COLUMN     "end_date" TIMESTAMP(6) NOT NULL,
ADD COLUMN     "payment_details" JSONB,
ADD COLUMN     "payment_intent_id" TEXT,
ADD COLUMN     "payment_status" TEXT,
ADD COLUMN     "pickup_location" JSONB,
ADD COLUMN     "start_date" TIMESTAMP(6) NOT NULL,
ADD COLUMN     "total_hours" DOUBLE PRECISION,
ADD COLUMN     "total_price" DOUBLE PRECISION,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL,
ADD COLUMN     "vehicle_id" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_pkey",
DROP COLUMN "bookingId",
DROP COLUMN "message_content",
DROP COLUMN "message_id",
ADD COLUMN     "body" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "emailVerified",
DROP COLUMN "isBlocked",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email_verified" TIMESTAMP(3),
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'USER',
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_pkey",
DROP COLUMN "brand",
DROP COLUMN "color",
DROP COLUMN "createdAt",
DROP COLUMN "isAvailable",
DROP COLUMN "licensePlate",
DROP COLUMN "minBookingHours",
DROP COLUMN "model",
DROP COLUMN "pricePerHour",
DROP COLUMN "quantity",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
DROP COLUMN "year",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "is_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_booking_hours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "price_per_hour" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "booking_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipcode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
