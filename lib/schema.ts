export const VEHICLE_TYPES = ['bike', 'scooter'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

export const VEHICLE_STATUS = ['active', 'maintenance', 'retired'] as const;
export type VehicleStatus = typeof VEHICLE_STATUS[number];

export const DOCUMENT_TYPES = {
  LICENSE: 'license',
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof'
} as const;

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DocumentType = 'license' | 'id_proof' | 'address_proof';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'user' | 'admin' | 'delivery_partner';

export const roleEnum = {
  enumValues: ['user', 'admin', 'delivery_partner'] as const,
} as const;

export interface WhatsAppLog {
  id: string;
  recipient: string;
  message: string;
  booking_id: string | null;
  status: string;
  error: string | null;
  message_type: string;
  chat_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  password_hash: string | null;
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
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
  is_available: boolean;
  images: string;
  status: VehicleStatus;
  description: string | null;
  features: string | null;
  is_delivery_enabled: boolean;
  zero_deposit: boolean;
  vehicle_category: 'normal' | 'delivery' | 'both';
  delivery_price_7_days: number | null;
  delivery_price_15_days: number | null;
  delivery_price_30_days: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_details: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  user_id: string;
  type: DocumentType;
  status: DocumentStatus;
  file_url: string;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export type NewUser = Omit<User, 'id' | 'created_at' | 'updated_at' | 'is_blocked'> & { id?: string; is_blocked?: boolean };
export type NewVehicle = Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'is_available' | 'status'> & { id?: string; is_available?: boolean; status?: VehicleStatus };
export type NewBooking = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'status' | 'payment_status'> & { id?: string; status?: BookingStatus; payment_status?: PaymentStatus };
export type NewDocument = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'status'> & { id?: string; status?: DocumentStatus };
export type NewWhatsAppLog = Omit<WhatsAppLog, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type NewSettings = Omit<Settings, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export type DiscountType = 'percentage' | 'fixed';

export interface Database {
  users: User;
  vehicles: Vehicle;
  bookings: Booking;
  documents: Document;
  whatsapp_logs: WhatsAppLog;
  settings: Settings;
}