-- Drop existing foreign key constraints that reference users.id
ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS "bookings_user_id_users_id_fk";
ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS "documents_user_id_users_id_fk";

-- Drop the existing users table completely
DROP TABLE IF EXISTS users;

-- Create the users table with proper UUID type
CREATE TABLE users (
    id UUID PRIMARY KEY,
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

-- Recreate foreign key constraints
ALTER TABLE bookings
ADD CONSTRAINT "bookings_user_id_users_id_fk"
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE documents
ADD CONSTRAINT "documents_user_id_users_id_fk"
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE NO ACTION ON UPDATE NO ACTION; 