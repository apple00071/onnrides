-- Insert sample car data if no cars exist
INSERT INTO vehicles (
  name, description, type, brand, model, year, color,
  transmission, fuel_type, mileage, seating_capacity,
  price_per_day, is_available, image_url, location
)
SELECT * FROM (VALUES
  (
    'Honda City',
    'The Honda City is a stylish and comfortable sedan perfect for city driving.',
    'car',
    'Honda',
    'City',
    2023,
    'White',
    'Automatic',
    'Petrol',
    18,
    5,
    2500.00,
    true,
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=2069&auto=format&fit=crop',
    'Madhapur'
  ),
  (
    'Hyundai Creta',
    'The Hyundai Creta is a popular SUV known for its comfort and performance.',
    'car',
    'Hyundai',
    'Creta',
    2023,
    'Black',
    'Automatic',
    'Diesel',
    16,
    5,
    3000.00,
    true,
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=2070&auto=format&fit=crop',
    'Eragadda'
  ),
  (
    'Maruti Swift',
    'The Maruti Swift is a compact and fuel-efficient hatchback.',
    'car',
    'Maruti',
    'Swift',
    2023,
    'Red',
    'Manual',
    'Petrol',
    22,
    5,
    1800.00,
    true,
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=2070&auto=format&fit=crop',
    'Madhapur'
  )
) AS v(name, description, type, brand, model, year, color,
      transmission, fuel_type, mileage, seating_capacity,
      price_per_day, is_available, image_url, location)
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles WHERE type = 'car' LIMIT 1
); 