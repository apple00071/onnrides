-- Create vehicle_returns table
CREATE TABLE IF NOT EXISTS vehicle_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  condition_notes TEXT,
  damages JSONB DEFAULT '[]',
  additional_charges DECIMAL(10, 2) DEFAULT 0,
  odometer_reading DECIMAL(10, 2),
  fuel_level DECIMAL(5, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  security_deposit_deductions DECIMAL(10, 2) DEFAULT 0,
  security_deposit_refund_amount DECIMAL(10, 2) DEFAULT 0,
  security_deposit_refund_method TEXT,
  deduction_reasons TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_returns_booking_id ON vehicle_returns(booking_id);
