-- Delete existing admin user first to ensure clean state
DELETE FROM users WHERE email = 'admin@onnrides.com';

-- Insert admin user with known working bcrypt hash for 'admin123'
INSERT INTO users (
    id,
    name,
    email,
    password_hash,
    role,
    phone,
    created_at,
    updated_at
) VALUES (
    'admin_' || extract(epoch from now())::text,
    'Admin',
    'admin@onnrides.com',
    '$2a$12$k8Y6J6C0vHKHvKD7GD/Tl.YHWxXFyxXNNJZKoFxWrHvwJC0.YL2Vy',
    'admin',
    '1234567890',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
); 