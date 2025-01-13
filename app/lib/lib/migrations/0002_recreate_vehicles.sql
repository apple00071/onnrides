-- Drop existing tables with dependencies
DROP TABLE IF EXISTS "vehicle_locations" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "vehicles" CASCADE;

-- Recreate vehicles table
CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "quantity" integer DEFAULT 1,
    "price_per_day" integer NOT NULL,
    "location" jsonb NOT NULL,
    "images" jsonb NOT NULL,
    "is_available" boolean DEFAULT true,
    "status" text DEFAULT 'active',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Recreate dependent tables
CREATE TABLE IF NOT EXISTS "vehicle_locations" (
    "id" serial PRIMARY KEY NOT NULL,
    "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
    "location_id" integer NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bookings" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
    "start_date" timestamp NOT NULL,
    "end_date" timestamp NOT NULL,
    "total_price" integer NOT NULL,
    "status" text DEFAULT 'pending',
    "payment_status" text DEFAULT 'pending',
    "payment_intent_id" text,
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
); 