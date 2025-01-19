-- Add test bike
INSERT INTO vehicles (
  name,
  type,
  location,
  quantity,
  price_per_day,
  price_12hrs,
  price_24hrs,
  price_7days,
  price_15days,
  price_30days,
  min_booking_hours,
  images,
  is_available,
  status
) VALUES (
  'Honda Shine',
  'bike',
  '["Madhapur"]',
  1,
  25.00,
  17.00,
  30.00,
  150.00,
  280.00,
  500.00,
  8,
  '[]',
  true,
  'active'
); 