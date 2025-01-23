import {
  integer,
  text,
  sqliteTable,
  real,
} from 'drizzle-orm/sqlite-core';
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

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  phone: text('phone'),
  reset_token: text('reset_token'),
  reset_token_expiry: integer('reset_token_expiry', { mode: 'timestamp' }),
  is_blocked: integer('is_blocked', { mode: 'boolean' }).default(false),
  role: text('role', { enum: roleEnum.enumValues }).default('user').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  location: text('location').notNull(),
  quantity: integer('quantity').notNull(),
  price_per_hour: real('price_per_hour').notNull(),
  min_booking_hours: integer('min_booking_hours').notNull(),
  is_available: integer('is_available', { mode: 'boolean' }).default(true),
  images: text('images').notNull(),
  status: text('status').default('active').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  start_date: integer('start_date', { mode: 'timestamp' }).notNull(),
  end_date: integer('end_date', { mode: 'timestamp' }).notNull(),
  total_hours: real('total_hours').notNull(),
  total_price: real('total_price').notNull(),
  status: text('status').default('pending').notNull(),
  payment_status: text('payment_status').default('pending').notNull(),
  payment_details: text('payment_details'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  status: text('status').default('pending').notNull(),
  file_url: text('file_url').notNull(),
  rejection_reason: text('rejection_reason'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
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