-- Add delivery-related columns to vehicles table

-- First check if these columns already exist
DO $$ 
BEGIN 
  -- Add is_delivery_enabled column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'is_delivery_enabled') THEN
    ALTER TABLE vehicles ADD COLUMN "is_delivery_enabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add delivery_price_7_days column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_7_days') THEN
    ALTER TABLE vehicles ADD COLUMN "delivery_price_7_days" DECIMAL(10,2) NULL;
  END IF;

  -- Add delivery_price_15_days column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_15_days') THEN
    ALTER TABLE vehicles ADD COLUMN "delivery_price_15_days" DECIMAL(10,2) NULL;
  END IF;

  -- Add delivery_price_30_days column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_30_days') THEN
    ALTER TABLE vehicles ADD COLUMN "delivery_price_30_days" DECIMAL(10,2) NULL;
  END IF;

END $$; 