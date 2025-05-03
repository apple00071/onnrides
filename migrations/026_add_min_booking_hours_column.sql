-- Add min_booking_hours column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS min_booking_hours integer DEFAULT 1;

-- Update min_booking_hours to match minBookingHours for existing records
UPDATE vehicles SET min_booking_hours = "minBookingHours";

-- Add a trigger to keep minBookingHours and min_booking_hours in sync
CREATE OR REPLACE FUNCTION sync_min_hours() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW."minBookingHours" IS DISTINCT FROM OLD."minBookingHours" THEN
            NEW.min_booking_hours := NEW."minBookingHours";
        ELSIF NEW.min_booking_hours IS DISTINCT FROM OLD.min_booking_hours THEN
            NEW."minBookingHours" := NEW.min_booking_hours;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vehicle_min_hours ON vehicles;

CREATE TRIGGER sync_vehicle_min_hours
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION sync_min_hours(); 