-- Add description column to vehicles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE vehicles
        ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add location columns to bookings if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'pickup_location'
    ) THEN
        ALTER TABLE bookings
        ADD COLUMN pickup_location TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'drop_location'
    ) THEN
        ALTER TABLE bookings
        ADD COLUMN drop_location TEXT;
    END IF;
END $$;

-- Add test data
DO $$
DECLARE
    admin_id integer;
BEGIN
    -- Get admin user id
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;

    -- Add some test vehicles if none exist
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE name = 'Test Vehicle 1') THEN
        INSERT INTO vehicles (
            name, 
            description, 
            price_per_day, 
            status, 
            is_available, 
            owner_id, 
            type,
            location
        )
        VALUES 
            (
                'Test Vehicle 1', 
                'Luxury sedan for comfortable rides', 
                100.00, 
                'active', 
                true, 
                admin_id, 
                'car',
                'City Center'
            ),
            (
                'Test Vehicle 2', 
                'Sports car for exciting drives', 
                150.00, 
                'active', 
                true, 
                admin_id, 
                'car',
                'Airport'
            ),
            (
                'Test Vehicle 3', 
                'SUV for family trips', 
                120.00, 
                'active', 
                true, 
                admin_id, 
                'car',
                'Beach Area'
            );
    END IF;

    -- Get or create a test user
    DECLARE
        test_user_id integer;
        vehicle_id integer;
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com') THEN
            INSERT INTO users (email, password_hash, role)
            VALUES ('test@example.com', '$2a$10$rK7PVQTBUuuqmkNhY2XZCOJOKxdeeD0Hs0H3LC/e9GgO0dMEOiUPe', 'user')
            RETURNING id INTO test_user_id;

            INSERT INTO profiles (user_id, first_name, last_name)
            VALUES (test_user_id, 'Test', 'User');
        ELSE
            SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com';
        END IF;

        -- Get first vehicle id
        SELECT id INTO vehicle_id FROM vehicles WHERE name = 'Test Vehicle 1' LIMIT 1;

        -- Add test bookings if none exist
        IF NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = test_user_id) AND vehicle_id IS NOT NULL THEN
            INSERT INTO bookings (
                user_id,
                vehicle_id,
                pickup_datetime,
                dropoff_datetime,
                pickup_location,
                drop_location,
                total_amount,
                status
            )
            VALUES 
                (
                    test_user_id,
                    vehicle_id,
                    NOW(),
                    NOW() + INTERVAL '3 days',
                    'Airport',
                    'City Center',
                    300.00,
                    'completed'
                ),
                (
                    test_user_id,
                    vehicle_id,
                    NOW() - INTERVAL '7 days',
                    NOW() - INTERVAL '5 days',
                    'City Center',
                    'Beach Resort',
                    200.00,
                    'completed'
                ),
                (
                    test_user_id,
                    vehicle_id,
                    NOW() + INTERVAL '7 days',
                    NOW() + INTERVAL '9 days',
                    'Train Station',
                    'Shopping Mall',
                    250.00,
                    'pending'
                );
        END IF;

        -- Add some pending document submissions
        IF NOT EXISTS (SELECT 1 FROM document_submissions WHERE user_id = test_user_id) THEN
            INSERT INTO document_submissions (user_id, document_type, status, file_url)
            VALUES 
                (test_user_id, 'driver_license', 'pending', '/documents/test-license.pdf'),
                (test_user_id, 'identity_proof', 'pending', '/documents/test-identity.pdf');
        END IF;
    END;
END $$; 