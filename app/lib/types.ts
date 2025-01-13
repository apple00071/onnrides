// Common Types
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  password_hash: string;
}

// Vehicle Types
export interface Vehicle extends BaseEntity {
  name: string;
  description: string;
  type: 'car' | 'bike';
  brand: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  seats: number;
  transmission: 'manual' | 'automatic';
  fuel_type: string;
  price_per_day: number;
  location: any; // JSONB in database
  images: string[]; // JSONB in database
  is_available: boolean;
  owner_id: string;
}

// Booking Types
export interface Booking extends BaseEntity {
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_intent_id?: string;
  notes?: string;
}

// Document Types
export interface Document extends BaseEntity {
  user_id: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

// Auth Types
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
} 