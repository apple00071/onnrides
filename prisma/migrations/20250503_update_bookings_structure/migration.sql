-- First rename the date columns
ALTER TABLE "bookings" RENAME COLUMN "start_date" TO "pickup_time";
ALTER TABLE "bookings" RENAME COLUMN "end_date" TO "dropoff_time";

-- Then rename the price column
ALTER TABLE "bookings" RENAME COLUMN "total_price" TO "total_amount";

-- Add payment_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'payment_id') THEN
        ALTER TABLE "bookings" ADD COLUMN "payment_id" TEXT;
    END IF;
END $$; 