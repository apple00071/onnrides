-- First, let's update the admin user's password with a correct bcrypt hash
UPDATE users 
SET password_hash = '$2a$10$3NxM9C1PZxwUz3kKKSbBK.tKqV3P6p.qGkLmJNHlHm4yAr3HLq0Uy'
WHERE email = 'admin@onnrides.com';

-- Verify the update
SELECT id, email, name, role, password_hash FROM users WHERE email = 'admin@onnrides.com'; 