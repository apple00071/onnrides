-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "delivery_price_15_days" REAL,
ADD COLUMN     "delivery_price_30_days" REAL,
ADD COLUMN     "delivery_price_7_days" REAL,
ADD COLUMN     "vehicle_category" VARCHAR(10) NOT NULL DEFAULT 'normal';

-- CreateIndex
CREATE INDEX "idx_vehicle_category" ON "vehicles"("vehicle_category");
