-- Create vehicle returns table
CREATE TABLE IF NOT EXISTS vehicle_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  return_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  condition_notes TEXT,
  damages TEXT[],
  additional_charges DECIMAL(10,2) DEFAULT 0,
  odometer_reading INTEGER,
  fuel_level INTEGER CHECK (fuel_level >= 0 AND fuel_level <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed')),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX idx_vehicle_returns_booking_id ON vehicle_returns(booking_id);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_returns_timestamp
  BEFORE UPDATE ON vehicle_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_returns_updated_at(); 