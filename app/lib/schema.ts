import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
  jsonb,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);
export const documentTypeEnum = pgEnum("document_type", ["license", "insurance", "registration"]);
export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'car',
  'bike',
  'scooter',
  'bicycle',
]);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);

// Define tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  phone: text("phone"),
  reset_token: text("reset_token"),
  reset_token_expiry: timestamp("reset_token_expiry"),
  is_blocked: boolean("is_blocked").default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow()
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: vehicleTypeEnum('type').notNull(),
  location: text('location').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 0 }).notNull(),
  price_per_hour: decimal('price_per_hour', { precision: 10, scale: 2 }).notNull(),
  min_booking_hours: decimal('min_booking_hours', { precision: 10, scale: 2 }).notNull(),
  images: text('images').notNull(),
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  vehicle_id: uuid('vehicle_id').notNull().references(() => vehicles.id),
  pickup_datetime: timestamp('pickup_datetime', { withTimezone: true }).notNull(),
  dropoff_datetime: timestamp('dropoff_datetime', { withTimezone: true }).notNull(),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum('status').notNull().default('pending'),
  payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  type: documentTypeEnum("type").notNull(),
  file_url: text("file_url").notNull(),
  status: statusEnum("status").notNull().default("pending"),
  rejection_reason: text("rejection_reason"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  bookings: many(bookings),
  documents: many(documents)
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  bookings: many(bookings)
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.user_id],
    references: [users.id]
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicle_id],
    references: [vehicles.id]
  })
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.user_id],
    references: [users.id]
  })
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert; 