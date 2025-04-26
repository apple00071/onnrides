-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing foreign key constraints that reference users.id
ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS "bookings_user_id_users_id_fk";
ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS "documents_user_id_users_id_fk";

-- Create a temporary table with the correct UUID type
CREATE TABLE users_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Drop the existing users table
DROP TABLE IF EXISTS users;

-- Rename the new table to users
ALTER TABLE users_new RENAME TO users;

-- Create email index
CREATE UNIQUE INDEX "users_email_unique" ON users(email);

-- Recreate foreign key constraints
ALTER TABLE bookings
ADD CONSTRAINT "bookings_user_id_users_id_fk"
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE documents
ADD CONSTRAINT "documents_user_id_users_id_fk"
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE NO ACTION ON UPDATE NO ACTION; 