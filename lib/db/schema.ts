import {
  integer,
  text,
  pgTable,
  real,
  boolean,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from '@auth/core/adapters';
import { sql } from 'drizzle-orm';

// Define booking status and payment status as string literals for type safety
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DocumentType = 'license' | 'id_proof' | 'address_proof';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// Define role enum
export const roleEnum = {
  enumValues: ['user', 'admin'] as const,
} as const;

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password_hash: text('password_hash').notNull(),
  phone: text('phone'),
  reset_token: text('reset_token'),
  reset_token_expiry: timestamp('reset_token_expiry'),
  is_blocked: boolean('is_blocked').default(false),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  images: text('images').notNull(),
  price_per_hour: integer('price_per_hour').notNull(),
  is_available: boolean('is_available').notNull().default(true),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] }).notNull().default('active'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  vehicle_id: uuid('vehicle_id').notNull().references(() => vehicles.id),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  total_hours: integer('total_hours').notNull(),
  total_price: integer('total_price').notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'cancelled'] }).notNull().default('pending'),
  payment_status: text('payment_status', { enum: ['pending', 'paid', 'failed'] }).notNull().default('pending'),
  payment_details: text('payment_details'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  status: text('status').default('pending').notNull(),
  file_url: text('file_url').notNull(),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.user_id],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.user_id],
    references: [users.id],
  }),
})); 