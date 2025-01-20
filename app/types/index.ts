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