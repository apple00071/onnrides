-- First ensure payments table has the correct structure
DO $$ 
BEGIN
    -- Check if payments table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        CREATE TABLE payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            status VARCHAR(50),
            payment_reference VARCHAR(255),
            order_id VARCHAR(255) UNIQUE,
            user_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        -- If table exists but needs to be modified
        -- First, create a temporary column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'id' 
            AND data_type != 'uuid'
        ) THEN
            -- Create new UUID column
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
            
            -- Drop existing primary key constraint
            ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_pkey;
            
            -- Set new_id as primary key
            ALTER TABLE payments ADD PRIMARY KEY (new_id);
            
            -- Drop old id column
            ALTER TABLE payments DROP COLUMN id;
            
            -- Rename new_id to id
            ALTER TABLE payments RENAME COLUMN new_id TO id;
        END IF;
    END IF;
END $$;

-- Add payment_id to bookings if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN payment_id UUID;
    END IF;
END $$;

-- Add the foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_payment_id_fkey'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_payment_id_fkey 
        FOREIGN KEY (payment_id) 
        REFERENCES payments(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bookings_payment_id'
    ) THEN
        CREATE INDEX idx_bookings_payment_id ON bookings(payment_id);
    END IF;
END $$; 