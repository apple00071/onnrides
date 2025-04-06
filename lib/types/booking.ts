export type BookingStatus = 'pending' | 'confirmed' | 'initiated' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location?: string;
  images?: string[];
  price_per_hour?: number;
}

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_hours?: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_details?: any;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  booking_id?: string;
} 