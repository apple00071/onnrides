-- Migration: Add vehicle_returns table
-- Purpose: Fix "Complete Booking" error by creating missing vehicle_returns table
-- Date: 2025-12-10

-- Create vehicle_returns table
CREATE TABLE IF NOT EXISTS vehicle_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  condition_notes TEXT,
  damages JSONB DEFAULT '[]'::jsonb,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  odometer_reading INTEGER DEFAULT 0,
  fuel_level INTEGER DEFAULT 100,
  status TEXT DEFAULT 'completed',
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  security_deposit_deductions NUMERIC(10,2) DEFAULT 0,
  security_deposit_refund_amount NUMERIC(10,2) DEFAULT 0,
  security_deposit_refund_method TEXT,
  deduction_reasons TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);;

-- Add unique constraint to ensure one return per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_returns_booking_id 
  ON vehicle_returns(booking_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_returns_status 
  ON vehicle_returns(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_returns_created_at 
  ON vehicle_returns(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE vehicle_returns IS 'Tracks vehicle returns and condition when bookings are completed';
COMMENT ON COLUMN vehicle_returns.damages IS 'JSON array of damage descriptions';
COMMENT ON COLUMN vehicle_returns.additional_charges IS 'Extra charges for damages, fuel, etc.';
COMMENT ON COLUMN vehicle_returns.security_deposit_deductions IS 'Amount deducted from security deposit';
COMMENT ON COLUMN vehicle_returns.security_deposit_refund_amount IS 'Amount refunded to customer';

-- Verify table was created
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename = 'vehicle_returns';
