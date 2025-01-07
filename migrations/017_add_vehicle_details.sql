-- Add missing columns to vehicles table
DO $$
BEGIN
    -- Add brand column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'brand'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN brand VARCHAR(100);
    END IF;

    -- Add model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'model'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN model VARCHAR(100);
    END IF;

    -- Add year column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'year'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN year INTEGER;
    END IF;

    -- Add color column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'color'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);
    END IF;

    -- Add transmission column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'transmission'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN transmission VARCHAR(50);
    END IF;

    -- Add fuel_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'fuel_type'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(50);
    END IF;

    -- Add mileage column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'mileage'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN mileage DECIMAL(10,2);
    END IF;

    -- Add seating_capacity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'seating_capacity'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN seating_capacity INTEGER;
    END IF;

    -- Add image_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Update test vehicles with more details
UPDATE vehicles
SET 
    brand = CASE name
        WHEN 'Test Vehicle 1' THEN 'Toyota'
        WHEN 'Test Vehicle 2' THEN 'BMW'
        WHEN 'Test Vehicle 3' THEN 'Honda'
    END,
    model = CASE name
        WHEN 'Test Vehicle 1' THEN 'Camry'
        WHEN 'Test Vehicle 2' THEN 'M3'
        WHEN 'Test Vehicle 3' THEN 'CR-V'
    END,
    year = CASE name
        WHEN 'Test Vehicle 1' THEN 2023
        WHEN 'Test Vehicle 2' THEN 2023
        WHEN 'Test Vehicle 3' THEN 2023
    END,
    color = CASE name
        WHEN 'Test Vehicle 1' THEN 'Silver'
        WHEN 'Test Vehicle 2' THEN 'Black'
        WHEN 'Test Vehicle 3' THEN 'White'
    END,
    transmission = CASE name
        WHEN 'Test Vehicle 1' THEN 'Automatic'
        WHEN 'Test Vehicle 2' THEN 'Automatic'
        WHEN 'Test Vehicle 3' THEN 'Automatic'
    END,
    fuel_type = CASE name
        WHEN 'Test Vehicle 1' THEN 'Petrol'
        WHEN 'Test Vehicle 2' THEN 'Petrol'
        WHEN 'Test Vehicle 3' THEN 'Diesel'
    END,
    mileage = CASE name
        WHEN 'Test Vehicle 1' THEN 15.5
        WHEN 'Test Vehicle 2' THEN 12.8
        WHEN 'Test Vehicle 3' THEN 14.2
    END,
    seating_capacity = CASE name
        WHEN 'Test Vehicle 1' THEN 5
        WHEN 'Test Vehicle 2' THEN 4
        WHEN 'Test Vehicle 3' THEN 7
    END,
    image_url = CASE name
        WHEN 'Test Vehicle 1' THEN '/cars/luxury.jpg'
        WHEN 'Test Vehicle 2' THEN '/cars/sports.jpg'
        WHEN 'Test Vehicle 3' THEN '/cars/suv.jpg'
    END
WHERE name LIKE 'Test Vehicle%'; 