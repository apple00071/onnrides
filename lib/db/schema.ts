import {
  integer,
  text,
  pgTable,
  real,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from '@auth/core/adapters';

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
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  phone: text('phone'),
  reset_token: text('reset_token'),
  reset_token_expiry: timestamp('reset_token_expiry'),
  is_blocked: boolean('is_blocked').default(false),
  role: text('role', { enum: roleEnum.enumValues }).default('user').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  location: text('location').notNull(),
  quantity: integer('quantity').notNull(),
  price_per_hour: real('price_per_hour').notNull(),
  min_booking_hours: integer('min_booking_hours').notNull(),
  is_available: boolean('is_available').default(true),
  images: text('images').notNull(),
  status: text('status').default('active').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  total_hours: real('total_hours').notNull(),
  total_price: real('total_price').notNull(),
  status: text('status').default('pending').notNull(),
  payment_status: text('payment_status').default('pending').notNull(),
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