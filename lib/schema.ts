import {
  text,
  integer,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';

export const VEHICLE_TYPES = ['bike', 'car'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

export const VEHICLE_STATUS = ['active', 'maintenance', 'retired'] as const;
export type VehicleStatus = typeof VEHICLE_STATUS[number];

export const DOCUMENT_TYPES = {
  LICENSE: 'license',
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof'
} as const;

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  phone: text('phone'),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  reset_token: text('reset_token'),
  reset_token_expiry: text('reset_token_expiry'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price_per_hour: text('price_per_hour').notNull(),
  location: text('location').notNull(),
  images: text('images').notNull().default('[]'),
  is_available: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] })
    .notNull()
    .default('active'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  total_price: text('total_price').notNull(),
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
  payment_id: text('payment_id'),
  payment_method: text('payment_method'),
  payment_details: text('payment_details'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
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
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}); 