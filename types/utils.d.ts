declare module '@/lib/utils/currency-formatter' {
  export function formatCurrency(amount: number): string;
  export function formatCurrencyWithDecimals(amount: number): string;
  export function formatCurrencyWithCustomDecimals(amount: number, decimals: number): string;
}

declare module '@/lib/utils/time-formatter' {
  export function formatDateTime(date: string | Date): string;
  export function formatDate(date: string | Date): string;
  export function formatTime(date: string | Date): string;
  export function formatIST(date: string | Date): string;
}


declare module './ViewBookingModal' {
  interface ViewBookingModalProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
  }

  export function ViewBookingModal(props: ViewBookingModalProps): JSX.Element;
}

declare module './ViewHistoryModal' {
  interface ViewHistoryModalProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
  }

  export function ViewHistoryModal(props: ViewHistoryModalProps): JSX.Element;
}

// Define our own types instead of importing from Prisma
export interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'completed' | 'cancelled';
  payment_details?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  pickup_location?: string;
  dropoff_location?: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: Date;
  updated_at: Date;
  is_blocked: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string;
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  is_available: boolean;
  images: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookingWithRelations extends Booking {
  user?: User;
  vehicle?: Vehicle;
}

export interface PaymentDetails {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: string;
  verified_at?: string;
  failed_at?: string;
} 