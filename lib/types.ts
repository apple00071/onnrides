export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  reset_token: string | null;
  reset_token_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  images: string[];
  is_available: boolean;
  status: 'active' | 'maintenance' | 'retired';
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_id: string | null;
  payment_method: string | null;
  payment_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  type: 'license' | 'id_proof' | 'address_proof';
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
} 