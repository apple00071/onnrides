import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text')
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('password_hash', 'text')
    .addColumn('phone', 'text')
    .addColumn('reset_token', 'text')
    .addColumn('reset_token_expiry', 'timestamp')
    .addColumn('is_blocked', 'boolean', (col) => col.defaultTo(false))
    .addColumn('role', 'text', (col) => col.notNull().defaultTo('user'))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create vehicles table
  await db.schema
    .createTable('vehicles')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('location', 'text', (col) => col.notNull())
    .addColumn('quantity', 'integer', (col) => col.notNull())
    .addColumn('price_per_hour', 'real', (col) => col.notNull())
    .addColumn('min_booking_hours', 'integer', (col) => col.notNull())
    .addColumn('is_available', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('images', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('description', 'text')
    .addColumn('features', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create bookings table
  await db.schema
    .createTable('bookings')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => 
      col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('vehicle_id', 'text', (col) => 
      col.notNull().references('vehicles.id').onDelete('cascade'))
    .addColumn('start_date', 'timestamp', (col) => col.notNull())
    .addColumn('end_date', 'timestamp', (col) => col.notNull())
    .addColumn('total_hours', 'real', (col) => col.notNull())
    .addColumn('total_price', 'real', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('payment_status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('payment_details', 'text')
    .addColumn('pickup_location', 'text')
    .addColumn('dropoff_location', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create documents table
  await db.schema
    .createTable('documents')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => 
      col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('file_url', 'text', (col) => col.notNull())
    .addColumn('rejection_reason', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order to handle foreign key constraints
  await db.schema.dropTable('documents').execute();
  await db.schema.dropTable('bookings').execute();
  await db.schema.dropTable('vehicles').execute();
  await db.schema.dropTable('users').execute();
} 