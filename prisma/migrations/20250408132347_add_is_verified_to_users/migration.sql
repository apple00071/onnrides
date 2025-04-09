/*
  Warnings:

  - A unique constraint covering the columns `[booking_id]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `booking_id` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "booking_id" TEXT NOT NULL,
ADD COLUMN     "booking_type" VARCHAR(20) DEFAULT 'online',
ADD COLUMN     "created_by" VARCHAR(50),
ADD COLUMN     "dropoff_datetime" TIMESTAMPTZ(6),
ADD COLUMN     "formatted_dropoff" TEXT,
ADD COLUMN     "formatted_end_date" TEXT,
ADD COLUMN     "formatted_pickup" TEXT,
ADD COLUMN     "formatted_start_date" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_intent_id" TEXT,
ADD COLUMN     "payment_method" VARCHAR(20),
ADD COLUMN     "payment_reference" VARCHAR(100),
ADD COLUMN     "pickup_datetime" TIMESTAMPTZ(6),
ALTER COLUMN "id" SET DEFAULT uuid_generate_v4(),
ALTER COLUMN "total_hours" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_booking_amount" DECIMAL(10,2),
    "max_discount_amount" DECIMAL(10,2),
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "usage_limit" INTEGER,
    "times_used" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message_content" TEXT,
    "booking_id" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "message_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" SERIAL NOT NULL,
    "message_id" VARCHAR(255),
    "instance_id" VARCHAR(100),
    "recipient" VARCHAR(100),
    "message" TEXT,
    "booking_id" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'pending',
    "error" TEXT,
    "message_type" VARCHAR(50),
    "chat_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_code" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_is_active" ON "coupons"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "AdminNotification_type_status_idx" ON "AdminNotification"("type", "status");

-- CreateIndex
CREATE INDEX "AdminNotification_recipient_channel_idx" ON "AdminNotification"("recipient", "channel");

-- CreateIndex
CREATE INDEX "AdminNotification_created_at_idx" ON "AdminNotification"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_user_id_key" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "idx_password_resets_expires_at" ON "password_resets"("expires_at");

-- CreateIndex
CREATE INDEX "idx_password_resets_token" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "unique_booking_id" ON "bookings"("booking_id");

-- CreateIndex
CREATE INDEX "idx_bookings_payment_intent_id" ON "bookings"("payment_intent_id");

-- CreateIndex
CREATE INDEX "idx_bookings_booking_id" ON "bookings"("booking_id");

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
