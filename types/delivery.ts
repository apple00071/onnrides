export type Location = {
  latitude: number;
  longitude: number;
  address: string;
};

export type DeliveryPartnerStatus = 'available' | 'busy' | 'offline';

export type DeliveryBookingStatus = 
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type CreateDeliveryPartnerInput = {
  userId: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
};

export type UpdateDeliveryPartnerInput = {
  isAvailable?: boolean;
  currentLocation?: Location;
};

export type CreateDeliveryBookingInput = {
  bookingId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  estimatedDistance: number;
  estimatedDuration: number;
  price: number;
};

export type UpdateDeliveryBookingInput = {
  status?: DeliveryBookingStatus;
  actualDuration?: number;
};

export type CreateDeliveryTrackingInput = {
  deliveryBookingId: string;
  location: Location;
  status: string;
  notes?: string;
};

export type UserDetails = {
  name: string;
  phone: string;
  email: string;
};

export interface DeliveryPartnerWithDetails {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  is_available: boolean;
  current_location: Location | null;
  rating: number;
  total_trips: number;
  created_at: Date;
  updated_at: Date;
  user: UserDetails;
}

export interface BookingDetails {
  id: string;
  user: UserDetails;
}

export interface DeliveryBookingWithDetails {
  id: string;
  delivery_partner_id: string;
  booking_id: string;
  pickup_location: Location;
  dropoff_location: Location;
  status: DeliveryBookingStatus;
  estimated_distance: number;
  estimated_duration: number;
  actual_duration: number | null;
  price: number;
  created_at: Date;
  updated_at: Date;
  delivery_partner: DeliveryPartnerWithDetails;
  booking: BookingDetails;
} 