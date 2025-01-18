export interface Vehicle {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price_per_day: number;
  location: { name: string[] };
  images: string[];
  is_available: boolean;
  status: 'active' | 'maintenance' | 'retired';
  created_at: string;
  updated_at: string;
}

export interface FormData {
  name: string;
  type: string;
  quantity: number;
  price_per_day: number;
  location: { name: string[] };
  status: 'active' | 'maintenance' | 'retired';
  is_available: boolean;
  images: string[];
} 