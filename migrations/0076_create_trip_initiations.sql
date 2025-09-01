-- Create trip_initiations table
CREATE TABLE IF NOT EXISTS trip_initiations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    checklist_completed BOOLEAN DEFAULT false,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    customer_dl_number VARCHAR(50),
    customer_address TEXT,
    emergency_contact VARCHAR(20),
    emergency_name VARCHAR(255),
    customer_aadhaar_number VARCHAR(20),
    customer_dob VARCHAR(20),
    vehicle_number VARCHAR(50),
    documents JSONB DEFAULT '{}',
    terms_accepted BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on booking_id to ensure one trip initiation per booking
CREATE UNIQUE INDEX IF NOT EXISTS trip_initiations_booking_id_idx ON trip_initiations(booking_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_initiations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trip_initiations_updated_at
    BEFORE UPDATE ON trip_initiations
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_initiations_updated_at(); 