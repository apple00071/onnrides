import { VehicleType } from '@/app/types';

export interface VehicleFormData {
  id?: string;
  name: string;
  type: VehicleType;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  location: string[];
  images: string[];
  is_available: boolean;
  quantity: number;
  min_booking_hours: number;
  status: 'active' | 'maintenance' | 'retired';
  description?: string | null;
  features?: string[];
  vehicle_category?: 'normal' | 'delivery' | 'both';
  is_delivery_enabled?: boolean;
  delivery_price_7_days?: number | null;
  delivery_price_15_days?: number | null;
  delivery_price_30_days?: number | null;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  delivery_price_7_days: number | null;
  delivery_price_15_days: number | null;
  delivery_price_30_days: number | null;
  vehicle_category: 'normal' | 'delivery' | 'both';
  location: string[];
  images: string[];
  quantity: number;
  min_booking_hours: number;
  is_available: boolean;
  status: 'active' | 'maintenance' | 'retired';
  description: string | null;
  features: string[];
  created_at: string;
  updated_at: string;
  pricing?: {
    price_per_hour: number;
    total_hours: number;
    chargeable_hours: number;
    total_price: number;
  };
  next_available?: {
    next_available: string;
    until: string | null;
  } | null;
  image_url?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  transmission?: string;
  fuel_type?: string;
  seating_capacity?: number;
}

export interface VehicleDetailsProps {
  vehicle: Vehicle;
}

export interface PageParams {
  vehicleId: string;
}

export interface PageProps {
  params: PageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
} 