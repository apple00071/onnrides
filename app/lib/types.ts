export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price_per_day: string;
  location: string;
  images: string[];
  is_available: boolean;
  status: 'active' | 'maintenance' | 'retired';
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  pickup_location?: string | null;
}

export interface Document {
  id: string;
  user_id: string;
  type: 'license' | 'id_proof' | 'address_proof';
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
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