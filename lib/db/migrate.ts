import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });
  
  try {
    console.log('⏳ Preparing database...');
    
    // Drop existing tables in the correct order (respecting foreign key constraints)
    await sql`DROP TABLE IF EXISTS documents CASCADE`;
    await sql`DROP TABLE IF EXISTS bookings CASCADE`;
    await sql`DROP TABLE IF EXISTS vehicles CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    
    console.log('✅ Existing tables dropped');
    
    // Create tables
    await sql`
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
      )
    `;

    await sql`
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
      )
    `;

    await sql`
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
      )
    `;

    await sql`
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
      )
    `;

    console.log('✅ Tables created');

    // Create admin user
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@onnrides.com') THEN
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
    `;

    console.log('✅ Admin user created');
    
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
  
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
}); 