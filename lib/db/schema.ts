import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
  jsonb,
  boolean,
  real,
  varchar
} from 'drizzle-orm/pg-core';

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
export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'unavailable', 'maintenance']);
export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  MAINTENANCE: 'maintenance'
} as const;

// Define tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  phone: varchar('phone', { length: 20 }),
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
  status: vehicleStatusEnum('status').notNull().default('available'),
  price_per_day: decimal('price_per_day', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  features: text('features').array(),
  images: text('images').array(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  vehicle_id: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  pickup_location: text('pickup_location'),
  dropoff_location: text('dropoff_location'),
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

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert; 