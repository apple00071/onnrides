-- Create admin user if none exists
DO $$
DECLARE
    admin_exists boolean;
    admin_id integer;
BEGIN
    -- Check if admin exists
    SELECT EXISTS (
        SELECT 1 FROM users WHERE role = 'admin'
    ) INTO admin_exists;

    IF NOT admin_exists THEN
        -- Insert admin user
        INSERT INTO users (email, password_hash, role)
        VALUES (
            'admin@onnrides.com',
            -- Default password is 'admin123' - please change this immediately after first login
            '$2a$10$rK7PVQTBUuuqmkNhY2XZCOJOKxdeeD0Hs0H3LC/e9GgO0dMEOiUPe',
            'admin'
        )
        RETURNING id INTO admin_id;

        -- Create admin profile
        INSERT INTO profiles (user_id, first_name, last_name)
        VALUES (
            admin_id,
            'Admin',
            'User'
        );
    END IF;
END $$; 