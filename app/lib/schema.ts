import { pgTable, text, timestamp, boolean, integer, serial, uuid, jsonb } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role').default('user'),
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
  quantity: integer('quantity').default(1),
  price_per_day: integer('price_per_day').notNull(),
  location: jsonb('location').notNull(),
  images: jsonb('images').notNull(),
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
  url: text('url').notNull(),
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
  total_price: integer('total_price').notNull(),
  status: text('status').default('pending'),
  payment_status: text('payment_status').default('pending'),
  payment_intent_id: text('payment_intent_id'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}); 