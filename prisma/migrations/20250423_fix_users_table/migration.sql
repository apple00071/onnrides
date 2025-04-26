-- Drop the existing table and its dependencies
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table with UUID
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

-- Create indexes
CREATE UNIQUE INDEX users_email_unique ON users(email);

-- Recreate foreign key constraints if needed
ALTER TABLE IF EXISTS bookings
    ADD CONSTRAINT bookings_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE IF EXISTS documents
    ADD CONSTRAINT documents_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION; 