import { VEHICLE_STATUS } from '@/lib/db/schema';

export type VehicleType = 'bike';
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
  description?: string;
  features?: string[];
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

export interface BookingSummaryDetails {
  vehicleId: string;
  vehicleName: string;
  location: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  pricePerHour: number;
  price7Days?: number;
  price15Days?: number;
  price30Days?: number;
  vehicle: {
    name: string;
    images: string;
    location: string;
  };
}

export interface BookingSummaryProps {
  booking: {
    id: string;
    vehicleId: string;
    vehicle?: Vehicle;
    pickup_date: string;
    return_date: string;
    pickup_time: string;
    return_time: string;
    pickupLocation: string;
    dropoffLocation: string;
    total_amount: number;
    total_price: number;
    basePrice: number;
    couponCode?: string;
    couponDiscount?: number;
  };
  className?: string;
  couponCode?: string;
  couponDiscount?: number;
  setCouponCode?: (code: string) => void;
  onProceedToPayment?: () => void;
  setIsLoading?: (loading: boolean) => void;
  showTermsModal?: boolean;
  setShowTermsModal?: (show: boolean) => void;
  isTermsAccepted?: boolean;
  setIsTermsAccepted?: (accepted: boolean) => void;
  isLoading?: boolean;
  error?: string;
  showActionButton?: boolean;
  onCouponApply?: (code: string) => void;
  onPaymentClick?: () => void;
  onTermsAccept?: () => void;
} 