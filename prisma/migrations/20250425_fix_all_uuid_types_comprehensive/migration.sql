-- Enable PostgreSQL extensions for UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First, drop all foreign key constraints to allow column type changes
DO $$ 
BEGIN
  -- Drop constraints from bookings table
  ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS "bookings_user_id_users_id_fk";
  ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS "bookings_vehicle_id_vehicles_id_fk";
  
  -- Drop constraints from documents table
  ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS "documents_user_id_users_id_fk";
  
  RAISE NOTICE 'Foreign key constraints dropped successfully';
END $$;

-- Fix users table - ensure ID is UUID type
DO $$ 
BEGIN
  -- Check if users.id needs to be fixed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    -- Create a temporary table with correct structure
    CREATE TABLE users_new (
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
    
    -- Copy data if possible, converting IDs to UUID
    BEGIN
      INSERT INTO users_new (
        id, name, email, password_hash, phone, reset_token, 
        reset_token_expiry, is_blocked, role, created_at, updated_at
      )
      SELECT 
        id::uuid, name, email, password_hash, phone, reset_token,
        reset_token_expiry, is_blocked, role, created_at, updated_at
      FROM users;
      RAISE NOTICE 'Data migrated from users to users_new successfully';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not migrate data from users to users_new: %', SQLERRM;
    END;
    
    -- Drop old table and rename new one
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    
    -- Create index on email
    CREATE UNIQUE INDEX "users_email_unique" ON users(email);
    
    RAISE NOTICE 'users table recreated with UUID primary key';
  ELSE
    RAISE NOTICE 'users.id already has UUID type';
  END IF;
END $$;

-- Fix bookings table - ensure all relevant columns are UUID type
DO $$ 
BEGIN
  -- Fix bookings.id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN id TYPE UUID USING id::uuid;
    RAISE NOTICE 'bookings.id converted to UUID type';
  ELSE
    RAISE NOTICE 'bookings.id already has UUID type';
  END IF;

  -- Fix bookings.user_id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    RAISE NOTICE 'bookings.user_id converted to UUID type';
  ELSE
    RAISE NOTICE 'bookings.user_id already has UUID type';
  END IF;
  
  -- Fix bookings.vehicle_id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'vehicle_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;
    RAISE NOTICE 'bookings.vehicle_id converted to UUID type';
  ELSE
    RAISE NOTICE 'bookings.vehicle_id already has UUID type';
  END IF;
END $$;

-- Fix documents table - ensure all relevant columns are UUID type
DO $$ 
BEGIN
  -- Fix documents.id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE documents ALTER COLUMN id TYPE UUID USING id::uuid;
    RAISE NOTICE 'documents.id converted to UUID type';
  ELSE
    RAISE NOTICE 'documents.id already has UUID type';
  END IF;
  
  -- Fix documents.user_id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE documents ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    RAISE NOTICE 'documents.user_id converted to UUID type';
  ELSE
    RAISE NOTICE 'documents.user_id already has UUID type';
  END IF;
END $$;

-- Fix vehicles table - ensure ID is UUID type
DO $$ 
BEGIN
  -- Fix vehicles.id if needed
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN id TYPE UUID USING id::uuid;
    RAISE NOTICE 'vehicles.id converted to UUID type';
  ELSE
    RAISE NOTICE 'vehicles.id already has UUID type';
  END IF;
END $$;

-- Recreate all foreign key constraints
DO $$ 
BEGIN
  -- Recreate foreign key constraint from bookings to users
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
  
  -- Recreate foreign key constraint from bookings to vehicles
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
  
  -- Recreate foreign key constraint from documents to users
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

-- Create or update a view to handle UUID conversion for API access
DO $$ 
BEGIN
  -- Drop the view if it exists
  DROP VIEW IF EXISTS users_view;
  
  -- Create a new view that explicitly casts UUID as text for API compatibility
  CREATE VIEW users_view AS
  SELECT 
    id::text as id,
    name,
    email,
    password_hash,
    phone,
    reset_token,
    reset_token_expiry,
    is_blocked,
    role,
    created_at,
    updated_at
  FROM users;
  
  RAISE NOTICE 'users_view created with explicit UUID to text conversion';
END $$;

-- Create a view for bookings if needed for API access
DO $$ 
BEGIN
  -- Drop the view if it exists
  DROP VIEW IF EXISTS bookings_view;
  
  -- Create a new view that explicitly casts UUID as text
  CREATE VIEW bookings_view AS
  SELECT 
    id::text as id,
    user_id::text as user_id,
    vehicle_id::text as vehicle_id,
    start_date,
    end_date,
    total_hours,
    total_price,
    status,
    payment_status,
    payment_details,
    created_at,
    updated_at,
    pickup_location,
    dropoff_location,
    booking_id,
    payment_intent_id
  FROM bookings;
  
  RAISE NOTICE 'bookings_view created with explicit UUID to text conversion';
END $$;

-- Create a view for documents if needed for API access
DO $$ 
BEGIN
  -- Drop the view if it exists
  DROP VIEW IF EXISTS documents_view;
  
  -- Create a new view that explicitly casts UUID as text
  CREATE VIEW documents_view AS
  SELECT 
    id::text as id,
    user_id::text as user_id,
    type,
    status,
    file_url,
    rejection_reason,
    created_at,
    updated_at
  FROM documents;
  
  RAISE NOTICE 'documents_view created with explicit UUID to text conversion';
END $$; 