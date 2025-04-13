import { Generated, Insertable, Selectable, ColumnType } from 'kysely';

export const VEHICLE_TYPES = ['bike'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

export const VEHICLE_STATUS = ['active', 'maintenance', 'retired'] as const;
export type VehicleStatus = typeof VEHICLE_STATUS[number];

export const DOCUMENT_TYPES = {
  LICENSE: 'license',
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof'
} as const;

// Define booking status and payment status as string literals for type safety
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DocumentType = 'license' | 'id_proof' | 'address_proof';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'user' | 'admin';

// Define role enum
export const roleEnum = {
  enumValues: ['user', 'admin'] as const,
} as const;

// WhatsApp logs table interface
interface WhatsAppLogsTable {
  id: string;
  recipient: string;
  message: string;
  booking_id: string | null;
  status: string;
  error: string | null;
  message_type: string;
  chat_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Settings table interface
interface SettingsTable {
  id: string;
  key: string;
  value: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Database interface
interface Database {
  users: UsersTable;
  vehicles: VehiclesTable;
  bookings: BookingsTable;
  documents: DocumentsTable;
  whatsapp_logs: WhatsAppLogsTable;
  settings: SettingsTable;
}

// Users table interface
interface UsersTable {
  id: string;
  name: string | null;
  email: string;
  password_hash: string | null;
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: Generated<boolean>;
  role: UserRole;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Vehicles table interface
interface VehiclesTable {
  id: string;
  name: string;
  type: VehicleType;
  location: string;
  quantity: number;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  min_booking_hours: number;
  is_available: Generated<boolean>;
  images: string;
  status: Generated<VehicleStatus>;
  description: string | null;
  features: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Bookings table interface
interface BookingsTable {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: Generated<BookingStatus>;
  payment_status: Generated<PaymentStatus>;
  payment_details: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Documents table interface
interface DocumentsTable {
  id: string;
  user_id: string;
  type: DocumentType;
  status: Generated<DocumentStatus>;
  file_url: string;
  rejection_reason: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Export types for insert and select operations
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;

export type Vehicle = Selectable<VehiclesTable>;
export type NewVehicle = Insertable<VehiclesTable>;

export type Booking = Selectable<BookingsTable>;
export type NewBooking = Insertable<BookingsTable>;

export type Document = Selectable<DocumentsTable>;
export type NewDocument = Insertable<DocumentsTable>;

export type WhatsAppLog = Selectable<WhatsAppLogsTable>;
export type NewWhatsAppLog = Insertable<WhatsAppLogsTable>;

export type DiscountType = 'percentage' | 'fixed';

export type Settings = Selectable<SettingsTable>;
export type NewSettings = Insertable<SettingsTable>;

// Export the Database interface
export type { Database }; 