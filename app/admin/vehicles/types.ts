export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string | string[] | { name: string[] };
  quantity: number;
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  images: string[];
  is_available: boolean;
  status: 'active' | 'maintenance' | 'retired';
  created_at?: string;
  updated_at?: string;
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