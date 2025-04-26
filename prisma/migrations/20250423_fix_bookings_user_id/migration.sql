-- First drop the foreign key constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_users_id_fk;

-- Alter the user_id column type to UUID
ALTER TABLE bookings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Recreate the foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT bookings_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE NO ACTION ON UPDATE NO ACTION; 