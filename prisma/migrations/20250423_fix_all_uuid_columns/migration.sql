-- Drop foreign key constraints first
ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_user_id_users_id_fk;
ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_vehicles_id_fk;
ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS documents_user_id_users_id_fk;

-- Drop existing tables that need to be recreated
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- Create users table with UUID
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    phone TEXT,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP(6),
    is_blocked BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table with UUID
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_hour REAL NOT NULL,
    min_booking_hours INTEGER NOT NULL,
    is_available BOOLEAN DEFAULT true,
    images TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    price_15_days REAL,
    price_30_days REAL,
    price_7_days REAL
);

-- Create bookings table with UUID references
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    start_date TIMESTAMP(6) NOT NULL,
    end_date TIMESTAMP(6) NOT NULL,
    total_hours REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_details TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    pickup_location TEXT,
    dropoff_location TEXT,
    booking_id TEXT,
    payment_intent_id TEXT UNIQUE
);

-- Create documents table with UUID references
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    file_url TEXT NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE INDEX idx_booking_user_status ON bookings(user_id, status);
CREATE INDEX idx_booking_vehicle_dates ON bookings(vehicle_id, start_date, end_date);
CREATE INDEX idx_booking_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_payment_intent_id ON bookings(payment_intent_id);
CREATE INDEX idx_vehicle_status_availability ON vehicles(status, is_available);
CREATE INDEX idx_vehicle_location_type ON vehicles(location, type);
CREATE INDEX idx_vehicle_updated_at ON vehicles(updated_at);

-- Add foreign key constraints
ALTER TABLE bookings
    ADD CONSTRAINT bookings_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_vehicle_id_vehicles_id_fk
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE documents
    ADD CONSTRAINT documents_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION; 