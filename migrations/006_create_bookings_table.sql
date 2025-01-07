-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_location TEXT,
    drop_location TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id and vehicle_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Create trigger for updating timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
        CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 