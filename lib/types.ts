import { NextResponse } from 'next/server';

// Custom response type for API endpoints
export type ApiNextResponse<T = unknown> = NextResponse & {
  json: () => Promise<T>;
};

// Remove duplicate NextResponse definition
declare module 'next/server' {
  interface ResponseInit {
    status?: number;
    headers?: Record<string, string>;
  }
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  password_hash: string;
  role: UserRole;
  reset_token: string | null;
  reset_token_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  min_booking_days: number;
  images: string[];
  is_available: boolean;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export interface CreateBookingBody {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  total_price: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_id: string | null;
  payment_method: string | null;
  payment_details: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Document {
  id: string;
  user_id: string;
  type: DocumentType;
  file_url: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'license' | 'id_proof' | 'address_proof';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface DocumentCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface BookingCounts {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface PricingPlan {
  days: number;
  price: number;
  label: string;
  description: string;
  savings_percentage?: number;
}

export interface VehiclePricing {
  price_per_day: number;
  total_days: number;
  chargeable_days: number;
  total_price: number;
  booking_details: BookingDetails;
  selected_plan?: PricingPlan;
}

export interface BookingDetails {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleImage: string;
  pricePerDay: number;
  location: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  minDays: number;
  maxDays: number;
  weekendMultiplier: number;
  minBookingNotice: number;
  maxBookingAdvance: number;
  allowedPickupTimes: string[];
  allowedDropoffTimes: string[];
  pricingPlans: PricingPlan[];
  termsAndConditions: {
    deposit: number;
    fuelPolicy: string;
    insuranceDetails: string;
    cancellationPolicy: string;
    documentsRequired: string[];
  };
}

export interface VehicleResponse {
  id: string;
  name: string;
  type: string;
  status: VehicleStatus;
  price_per_day: number;
  description?: string;
  features: string[];
  images: string[];
  image_url: string;
  location: string[];
  active_bookings: Booking[];
  pricing: VehiclePricing;
  booking_details: BookingDetails;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentDetails {
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface CreateVehicleBody {
  name: string;
  type: string;
  location: string[];
  price_per_hour: number;
  description?: string;
  features?: string[];
  images?: string[];
  status?: VehicleStatus;
}

export interface DbQueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface DbUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  password_hash: string;
  is_blocked: boolean;
} 