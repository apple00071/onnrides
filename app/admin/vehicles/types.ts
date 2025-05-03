export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string | string[] | { name: string[] };
  quantity: number;
  price_per_hour: number;
  pricePerHour?: number;
  min_booking_hours: number;
  minBookingHours?: number;
  images: string[];
  is_available: boolean;
  isAvailable?: boolean;
  status: 'active' | 'maintenance' | 'retired';
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  price_7_days?: number | null;
  price_15_days?: number | null;
  price_30_days?: number | null;
  delivery_price_7_days?: number | null;
  delivery_price_15_days?: number | null;
  delivery_price_30_days?: number | null;
  is_delivery_enabled?: boolean;
  isDeliveryEnabled?: boolean;
  vehicle_category?: 'normal' | 'delivery' | 'both';
  available?: boolean;
  nextAvailable?: {
    nextAvailable: string;
    until: string | null;
  } | null;
  description?: string;
  features?: string[];
}

export interface FormData {
  name: string;
  type: string;
  quantity: number;
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  location: { name: string[] };
  status: 'active' | 'maintenance' | 'retired';
  is_available: boolean;
  images: string[];
} 