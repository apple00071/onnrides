import { pgTable, text, timestamp, boolean, integer, serial, uuid } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  password: text('password'),
  role: text('role').default('user'),
  is_blocked: boolean('is_blocked').default(false),
  is_verified: boolean('is_verified').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Locations table
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Vehicles table
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  price_per_day: integer('price_per_day').notNull(),
  image_url: text('image_url').default('/cars/default.jpg'),
  is_available: boolean('is_available').default(true),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Vehicle Locations table (many-to-many relationship)
export const vehicle_locations = pgTable('vehicle_locations', {
  id: serial('id').primaryKey(),
  vehicle_id: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  location_id: integer('location_id').references(() => locations.id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Documents table
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  file_url: text('file_url').notNull(),
  status: text('status').default('pending'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Bookings table
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vehicle_id: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  total_amount: integer('total_amount').notNull(),
  status: text('status').default('pending'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}); 