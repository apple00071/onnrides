-- A safer approach to standardize column names by checking if they exist first
-- This avoids errors during deployment if columns have already been renamed

-- Function to safely rename columns
CREATE OR REPLACE FUNCTION safely_rename_column(
    target_table TEXT,
    old_column TEXT,
    new_column TEXT
) RETURNS VOID AS $$
BEGIN
    -- Check if the old column exists and the new column doesn't
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = target_table 
        AND column_name = old_column
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = target_table 
        AND column_name = new_column
    ) THEN
        -- Execute the rename
        EXECUTE FORMAT('ALTER TABLE %I RENAME COLUMN %I TO %I', 
                      target_table, old_column, new_column);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Safely rename columns in the bookings table
SELECT safely_rename_column('bookings', 'userId', 'user_id');
SELECT safely_rename_column('bookings', 'vehicleId', 'vehicle_id');
SELECT safely_rename_column('bookings', 'startDate', 'start_date');
SELECT safely_rename_column('bookings', 'endDate', 'end_date');
SELECT safely_rename_column('bookings', 'totalHours', 'total_hours');
SELECT safely_rename_column('bookings', 'totalPrice', 'total_price');
SELECT safely_rename_column('bookings', 'paymentStatus', 'payment_status');
SELECT safely_rename_column('bookings', 'paymentDetails', 'payment_details');
SELECT safely_rename_column('bookings', 'createdAt', 'created_at');
SELECT safely_rename_column('bookings', 'updatedAt', 'updated_at');
SELECT safely_rename_column('bookings', 'pickupLocation', 'pickup_location');
SELECT safely_rename_column('bookings', 'dropoffLocation', 'dropoff_location');
SELECT safely_rename_column('bookings', 'bookingId', 'booking_id');
SELECT safely_rename_column('bookings', 'paymentIntentId', 'payment_intent_id');

-- Safely rename columns in the vehicles table
SELECT safely_rename_column('vehicles', 'pricePerHour', 'price_per_hour');
SELECT safely_rename_column('vehicles', 'minBookingHours', 'min_booking_hours');
SELECT safely_rename_column('vehicles', 'isAvailable', 'is_available');
SELECT safely_rename_column('vehicles', 'createdAt', 'created_at');
SELECT safely_rename_column('vehicles', 'updatedAt', 'updated_at');

-- Safely rename columns in the users table
SELECT safely_rename_column('users', 'passwordHash', 'password_hash');
SELECT safely_rename_column('users', 'resetToken', 'reset_token');
SELECT safely_rename_column('users', 'resetTokenExpiry', 'reset_token_expiry');
SELECT safely_rename_column('users', 'isBlocked', 'is_blocked');
SELECT safely_rename_column('users', 'createdAt', 'created_at');
SELECT safely_rename_column('users', 'updatedAt', 'updated_at');

-- Drop the function after use
DROP FUNCTION safely_rename_column;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available); 