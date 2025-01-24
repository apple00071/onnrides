-- Check if admin exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@onnrides.com') THEN
        -- Create admin user with bcrypt hashed password 'admin123'
        INSERT INTO users (
            id,
            email,
            name,
            password_hash,
            role,
            created_at,
            updated_at
        ) VALUES (
            'cuid_' || substr(md5(random()::text), 1, 24),
            'admin@onnrides.com',
            'Admin',
            '$2a$10$YEqFIQU3uN.4LGQEGz1kLOCxVkgfwZ.U0TUPyPrz0Oz.3u.Z0ZUXW',
            'admin',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$; 