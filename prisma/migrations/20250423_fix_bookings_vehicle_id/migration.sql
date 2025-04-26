-- First drop the foreign key constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_vehicles_id_fk;

-- Alter the vehicle_id column type to UUID
ALTER TABLE bookings ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- Recreate the foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT bookings_vehicle_id_vehicles_id_fk 
FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) 
ON DELETE NO ACTION ON UPDATE NO ACTION; 