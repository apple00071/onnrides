-- Add price_per_hour column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_per_hour numeric DEFAULT 0;

-- Update price_per_hour to match pricePerHour for existing records
UPDATE vehicles SET price_per_hour = "pricePerHour";

-- Add a trigger to keep pricePerHour and price_per_hour in sync
CREATE OR REPLACE FUNCTION sync_price() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW."pricePerHour" IS DISTINCT FROM OLD."pricePerHour" THEN
            NEW.price_per_hour := NEW."pricePerHour";
        ELSIF NEW.price_per_hour IS DISTINCT FROM OLD.price_per_hour THEN
            NEW."pricePerHour" := NEW.price_per_hour;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vehicle_price ON vehicles;

CREATE TRIGGER sync_vehicle_price
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION sync_price(); 