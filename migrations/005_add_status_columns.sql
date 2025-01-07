-- Add status column to vehicles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'status') THEN
        ALTER TABLE vehicles ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Add status column to bookings table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'status') THEN
        ALTER TABLE bookings ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Add rate_per_day column to vehicles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'rate_per_day') THEN
        ALTER TABLE vehicles ADD COLUMN rate_per_day DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add pickup_datetime and dropoff_datetime columns to bookings table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'pickup_datetime') THEN
        ALTER TABLE bookings ADD COLUMN pickup_datetime TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'dropoff_datetime') THEN
        ALTER TABLE bookings ADD COLUMN dropoff_datetime TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add make and model columns to vehicles table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'make') THEN
        ALTER TABLE vehicles ADD COLUMN make VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'model') THEN
        ALTER TABLE vehicles ADD COLUMN model VARCHAR(50);
    END IF;
END $$;

-- Add first_name and last_name columns to profiles table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name VARCHAR(50);
    END IF;
END $$; 