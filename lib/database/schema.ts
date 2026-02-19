// Enums
export const ROLE = {
  USER: 'user',
  ADMIN: 'admin'
} as const;

export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const DOCUMENT_TYPE = {
  LICENSE: 'license',
  INSURANCE: 'insurance',
  REGISTRATION: 'registration'
} as const;

export const VEHICLE_TYPE = {
  BIKE: 'bike'
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;

export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  MAINTENANCE: 'maintenance'
} as const;

// Types
export type Role = typeof ROLE[keyof typeof ROLE];
export type Status = typeof STATUS[keyof typeof STATUS];
export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];
export type VehicleType = typeof VEHICLE_TYPE[keyof typeof VEHICLE_TYPE];
export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type VehicleStatus = typeof VEHICLE_STATUS[keyof typeof VEHICLE_STATUS];

export type User = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  permissions: Record<string, boolean>; // Dynamic permissions
  created_at: Date;
  updated_at: Date;
};

export type Permission =
  | 'manage_bookings'
  | 'manage_vehicles'
  | 'view_reports'
  | 'manage_finance'
  | 'manage_settings'
  | 'manage_users';

export type Vehicle = {
  id: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  price_per_day: number;
  description: string | null;
  features: string[];
  images: string[];
  created_at: Date;
  updated_at: Date;
};

export type Booking = {
  id: string;
  user_id: string;
  vehicle_id: string;
  pickup_location: string | null;
  dropoff_location: string | null;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_details: string | null;
  created_at: Date;
  updated_at: Date;
};

export type Document = {
  id: string;
  user_id: string;
  type: DocumentType;
  file_url: string;
  status: Status;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}; 