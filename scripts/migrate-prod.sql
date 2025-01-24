-- Create tables
CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text,
    "email" text NOT NULL,
    "password_hash" text,
    "phone" text,
    "reset_token" text,
    "reset_token_expiry" timestamp,
    "is_blocked" boolean DEFAULT false,
    "role" text DEFAULT 'user' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "location" text NOT NULL,
    "quantity" integer NOT NULL,
    "price_per_hour" real NOT NULL,
    "min_booking_hours" integer NOT NULL,
    "is_available" boolean DEFAULT true,
    "images" text NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "bookings" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "vehicle_id" text NOT NULL,
    "start_date" timestamp NOT NULL,
    "end_date" timestamp NOT NULL,
    "total_hours" real NOT NULL,
    "total_price" real NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "payment_status" text DEFAULT 'pending' NOT NULL,
    "payment_details" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "documents" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "type" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "file_url" text NOT NULL,
    "rejection_reason" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@onnrides.com') THEN
        -- Create admin user with bcrypt hashed password 'admin123'
        INSERT INTO users (
            id,
            email,
            name,
            password_hash,
            role,
            created_at,
            updated_at
        ) VALUES (
            'cuid_' || substr(md5(random()::text), 1, 24),
            'admin@onnrides.com',
            'Admin',
            '$2a$10$YEqFIQU3uN.4LGQEGz1kLOCxVkgfwZ.U0TUPyPrz0Oz.3u.Z0ZUXW',
            'admin',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$; 