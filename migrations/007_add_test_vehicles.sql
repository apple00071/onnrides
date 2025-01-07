-- First, ensure we have an admin user
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@onnrides.com') THEN
    INSERT INTO users (email, password_hash, role)
    VALUES ('admin@onnrides.com', '$2a$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WXAw4x5XAGTzWGdxoigi', 'admin');
  END IF;
END $$;

-- Get admin user id
WITH admin_user AS (
  SELECT id FROM users WHERE email = 'admin@onnrides.com' LIMIT 1
)
-- Add test vehicles
INSERT INTO vehicles (
  owner_id,
  name,
  type,
  location,
  price_per_day,
  image_url,
  status
) 
SELECT 
  id as owner_id,
  unnest(ARRAY[
    'Honda City',
    'Hyundai Creta',
    'Maruti Swift',
    'Toyota Innova',
    'Tata Nexon'
  ]) as name,
  unnest(ARRAY[
    'Sedan',
    'SUV',
    'Hatchback',
    'MPV',
    'SUV'
  ]) as type,
  unnest(ARRAY[
    'Hyderabad, Telangana',
    'Hyderabad, Telangana',
    'Hyderabad, Telangana',
    'Hyderabad, Telangana',
    'Hyderabad, Telangana'
  ]) as location,
  unnest(ARRAY[2500.00, 3000.00, 1800.00, 4000.00, 2200.00]) as price_per_day,
  unnest(ARRAY[
    '/cars/honda-city.jpg',
    '/cars/hyundai-creta.jpg',
    '/cars/maruti-swift.jpg',
    '/cars/toyota-innova.jpg',
    '/cars/tata-nexon.jpg'
  ]) as image_url,
  'active' as status
FROM admin_user; 