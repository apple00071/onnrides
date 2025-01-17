import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  json,
  uuid,
  decimal,
} from 'drizzle-orm/pg-core';

export const DOCUMENT_TYPES = {
  LICENSE: 'license',
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof'
} as const;

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price_per_day: decimal('price_per_day', { precision: 10, scale: 2 }).notNull(),
  location: text('location').notNull(),
  images: json('images').$type<string[]>().notNull().default([]),
  is_available: boolean('is_available').notNull().default(true),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] })
    .notNull()
    .default('active'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  vehicle_id: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  total_price: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: text('status', {
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
  })
    .notNull()
    .default('pending'),
  payment_status: text('payment_status', {
    enum: ['pending', 'paid', 'refunded'],
  })
    .notNull()
    .default('pending'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type', {
    enum: ['license', 'id_proof', 'address_proof'],
  }).notNull(),
  file_url: text('file_url').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] })
    .notNull()
    .default('pending'),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}); 