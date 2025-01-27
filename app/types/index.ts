import { VEHICLE_STATUS } from '@/lib/db/schema';

export type VehicleType = 'car' | 'bike' | 'scooter';
export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  location: string[];
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  images: string[];
  is_available: boolean;
  status: VehicleStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateVehicleBody {
  name: string;
  type: string;
  status: keyof typeof VEHICLE_STATUS;
  price_per_day: number;
  description?: string;
  features?: string[];
  images?: string[];
} 