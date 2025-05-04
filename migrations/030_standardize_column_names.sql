-- Standardize the bookings table column names to snake_case
ALTER TABLE bookings 
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE bookings 
  RENAME COLUMN "vehicleId" TO vehicle_id;

ALTER TABLE bookings 
  RENAME COLUMN "startDate" TO start_date;

ALTER TABLE bookings 
  RENAME COLUMN "endDate" TO end_date;

ALTER TABLE bookings 
  RENAME COLUMN "totalHours" TO total_hours;

ALTER TABLE bookings 
  RENAME COLUMN "totalPrice" TO total_price;

ALTER TABLE bookings 
  RENAME COLUMN "paymentStatus" TO payment_status;

ALTER TABLE bookings 
  RENAME COLUMN "paymentDetails" TO payment_details;

ALTER TABLE bookings 
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE bookings 
  RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE bookings 
  RENAME COLUMN "pickupLocation" TO pickup_location;

ALTER TABLE bookings 
  RENAME COLUMN "dropoffLocation" TO dropoff_location;

ALTER TABLE bookings 
  RENAME COLUMN "bookingId" TO booking_id;

ALTER TABLE bookings 
  RENAME COLUMN "paymentIntentId" TO payment_intent_id;

-- Standardize the vehicles table column names to snake_case
ALTER TABLE vehicles 
  RENAME COLUMN "pricePerHour" TO price_per_hour;

ALTER TABLE vehicles 
  RENAME COLUMN "minBookingHours" TO min_booking_hours;

ALTER TABLE vehicles 
  RENAME COLUMN "isAvailable" TO is_available;

ALTER TABLE vehicles 
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE vehicles 
  RENAME COLUMN "updatedAt" TO updated_at;

-- Standardize the users table column names to snake_case
ALTER TABLE users 
  RENAME COLUMN "passwordHash" TO password_hash;

ALTER TABLE users 
  RENAME COLUMN "resetToken" TO reset_token;

ALTER TABLE users 
  RENAME COLUMN "resetTokenExpiry" TO reset_token_expiry;

ALTER TABLE users 
  RENAME COLUMN "isBlocked" TO is_blocked;

ALTER TABLE users 
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE users 
  RENAME COLUMN "updatedAt" TO updated_at;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available); 