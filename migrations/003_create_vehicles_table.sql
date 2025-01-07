-- Drop existing table if it exists
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

-- Create vehicles table
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  location VARCHAR(100) NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_location ON vehicles(location);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create bookings table for vehicle availability
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  dropoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_booking_dates CHECK (dropoff_datetime > pickup_datetime)
);

-- Create index for faster booking lookups
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_dates ON bookings(pickup_datetime, dropoff_datetime);

-- Create trigger for updating updated_at
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 