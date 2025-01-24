import { pgEnum, pgTable, text, timestamp, uuid, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);
export const documentTypeEnum = pgEnum("document_type", ["license", "insurance", "registration"]);
export const vehicleTypeEnum = pgEnum("vehicle_type", ["car", "bike", "scooter"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "cancelled", "completed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

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

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  owner_id: uuid("owner_id").notNull().references(() => users.id),
  type: vehicleTypeEnum("type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: text("year").notNull(),
  color: text("color").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  price_per_day: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  is_available: boolean("is_available").default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow()
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  vehicle_id: uuid("vehicle_id").notNull().references(() => vehicles.id),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  payment_status: paymentStatusEnum("payment_status").notNull().default("pending"),
  payment_intent: text("payment_intent"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow()
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
export const usersRelations = relations(users as any, ({ many }) => ({
  vehicles: many(vehicles as any),
  bookings: many(bookings as any),
  documents: many(documents as any)
}));

export const vehiclesRelations = relations(vehicles as any, ({ one }) => ({
  owner: one(users as any, {
    fields: [vehicles.owner_id as any],
    references: [users.id as any]
  })
}));

export const bookingsRelations = relations(bookings as any, ({ one }) => ({
  user: one(users as any, {
    fields: [bookings.user_id as any],
    references: [users.id as any]
  }),
  vehicle: one(vehicles as any, {
    fields: [bookings.vehicle_id as any],
    references: [vehicles.id as any]
  })
}));

export const documentsRelations = relations(documents as any, ({ one }) => ({
  user: one(users as any, {
    fields: [documents.user_id as any],
    references: [users.id as any]
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