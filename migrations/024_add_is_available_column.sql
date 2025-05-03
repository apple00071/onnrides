-- Add is_available column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

-- Update is_available to match isAvailable for existing records
UPDATE vehicles SET is_available = "isAvailable";

-- Add a trigger to keep isAvailable and is_available in sync
CREATE OR REPLACE FUNCTION sync_availability() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW."isAvailable" IS DISTINCT FROM OLD."isAvailable" THEN
            NEW.is_available := NEW."isAvailable";
        ELSIF NEW.is_available IS DISTINCT FROM OLD.is_available THEN
            NEW."isAvailable" := NEW.is_available;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vehicle_availability ON vehicles;

CREATE TRIGGER sync_vehicle_availability
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION sync_availability(); 