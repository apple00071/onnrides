-- Add delivery partner specific pricing columns
ALTER TABLE vehicles
ADD COLUMN delivery_price_7_days REAL,
ADD COLUMN delivery_price_15_days REAL,
ADD COLUMN delivery_price_30_days REAL; 