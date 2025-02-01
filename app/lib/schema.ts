export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  daily_rate: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RENTED';
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  user_id: string;
  type: 'LICENSE' | 'INSURANCE' | 'REGISTRATION';
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: Date;
  updated_at: Date;
}

export const VEHICLE_TYPES = ['car', 'bike', 'scooter'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

export const LOCATIONS = [
  'Madhapur',
  'Gachibowli',
  'Kondapur',
  'Kukatpally',
  'Ameerpet',
  'Hitech City',
  'Jubilee Hills',
  'Banjara Hills',
  'Eragadda'
] as const;
export type Location = typeof LOCATIONS[number]; 