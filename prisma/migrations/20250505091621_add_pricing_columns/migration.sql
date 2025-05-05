-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "delivery_price_15_days" DOUBLE PRECISION,
ADD COLUMN     "delivery_price_30_days" DOUBLE PRECISION,
ADD COLUMN     "delivery_price_7_days" DOUBLE PRECISION,
ADD COLUMN     "is_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price_15_days" DOUBLE PRECISION,
ADD COLUMN     "price_30_days" DOUBLE PRECISION,
ADD COLUMN     "price_7_days" DOUBLE PRECISION,
ADD COLUMN     "vehicle_category" TEXT NOT NULL DEFAULT 'normal';
