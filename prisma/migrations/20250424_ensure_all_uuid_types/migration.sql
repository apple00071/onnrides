-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Check if the users table has the correct UUID type and fix if needed
DO $$ 
BEGIN
  -- Check if users.id is not UUID
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    -- Drop foreign key constraints
    ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS "bookings_user_id_users_id_fk";
    ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS "documents_user_id_users_id_fk";
    
    -- Drop and recreate users table with UUID
    DROP TABLE IF EXISTS users CASCADE;
    
    -- Create the users table with proper UUID type
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        phone TEXT,
        reset_token TEXT,
        reset_token_expiry TIMESTAMP(6),
        is_blocked BOOLEAN DEFAULT false,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create email index
    CREATE UNIQUE INDEX "users_email_unique" ON users(email);
    
    RAISE NOTICE 'users table recreated with UUID primary key';
  ELSE
    RAISE NOTICE 'users.id already has UUID type';
  END IF;
END $$;

-- Fix bookings.user_id if needed
DO $$ 
BEGIN
  -- Check if bookings.user_id is not UUID
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    -- Drop the foreign key constraint
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS "bookings_user_id_users_id_fk";
    
    -- Alter the column type
    ALTER TABLE bookings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    
    RAISE NOTICE 'bookings.user_id converted to UUID type';
  ELSE
    RAISE NOTICE 'bookings.user_id already has UUID type';
  END IF;
END $$;

-- Fix bookings.vehicle_id if needed
DO $$ 
BEGIN
  -- Check if bookings.vehicle_id is not UUID
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'vehicle_id' 
    AND data_type != 'uuid'
  ) THEN
    -- Drop the foreign key constraint
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS "bookings_vehicle_id_vehicles_id_fk";
    
    -- Alter the column type
    ALTER TABLE bookings ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;
    
    RAISE NOTICE 'bookings.vehicle_id converted to UUID type';
  ELSE
    RAISE NOTICE 'bookings.vehicle_id already has UUID type';
  END IF;
END $$;

-- Fix documents.user_id if needed
DO $$ 
BEGIN
  -- Check if documents.user_id is not UUID
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    -- Drop the foreign key constraint
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS "documents_user_id_users_id_fk";
    
    -- Alter the column type
    ALTER TABLE documents ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    
    RAISE NOTICE 'documents.user_id converted to UUID type';
  ELSE
    RAISE NOTICE 'documents.user_id already has UUID type';
  END IF;
END $$;

-- Recreate foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Recreate bookings -> users foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_user_id_users_id_fk'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT "bookings_user_id_users_id_fk"
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    RAISE NOTICE 'Recreated bookings_user_id_users_id_fk constraint';
  END IF;
  
  -- Recreate bookings -> vehicles foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_vehicle_id_vehicles_id_fk'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk"
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    RAISE NOTICE 'Recreated bookings_vehicle_id_vehicles_id_fk constraint';
  END IF;
  
  -- Recreate documents -> users foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_user_id_users_id_fk'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT "documents_user_id_users_id_fk"
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    RAISE NOTICE 'Recreated documents_user_id_users_id_fk constraint';
  END IF;
END $$; 