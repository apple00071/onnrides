-- Drop existing foreign key constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

-- Change user_id column type to UUID
ALTER TABLE bookings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE documents ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Re-add foreign key constraints
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; 