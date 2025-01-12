import { BaseItem } from '@/lib/db';

export interface User extends BaseItem {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isDocumentsVerified: boolean;
}

export interface Vehicle extends BaseItem {
  name: string;
  description: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  pricePerDay: number;
  location: string;
  images: string[];
  isAvailable: boolean;
  owner_id: string;
}

export interface Booking extends BaseItem {
  user_id: string;
  vehicle_id: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  paymentReference?: string;
  notes?: string;
}

export interface Document extends BaseItem {
  user_id: string;
  type: 'license' | 'insurance' | 'registration' | 'other';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Profile extends BaseItem {
  user_id: string;
  avatar?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  bio?: string;
}

export interface Session extends BaseItem {
  user_id: string;
  token: string;
  expires_at: Date;
}

export interface ResetToken extends BaseItem {
  user_id: string;
  token: string;
  expires_at: Date;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
} 