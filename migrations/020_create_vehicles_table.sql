-- Create vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(50) NOT NULL,
  transmission VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  mileage INTEGER NOT NULL,
  seating_capacity INTEGER NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  location VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available);

-- Insert sample data if the table is empty
INSERT INTO vehicles (
  name, description, type, brand, model, year, color,
  transmission, fuel_type, mileage, seating_capacity,
  price_per_day, is_available, image_url, location
)
SELECT
  'Royal Enfield Classic 350',
  'The Royal Enfield Classic 350 is a modern classic motorcycle that combines timeless style with modern technology.',
  'bike',
  'Royal Enfield',
  'Classic 350',
  2023,
  'Black',
  'Manual',
  'Petrol',
  40,
  2,
  1000.00,
  true,
  'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?q=80&w=2070&auto=format&fit=crop',
  'Madhapur'
WHERE NOT EXISTS (SELECT 1 FROM vehicles LIMIT 1);

-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id),
  user_id INTEGER REFERENCES users(id),
  pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  dropoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on booking date range for overlap checks
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(pickup_datetime, dropoff_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id); 