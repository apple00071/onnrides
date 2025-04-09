import { Generated } from 'kysely';

export interface DB {
  users: {
    id: string;
    name: string | null;
    email: string;
    password_hash: string | null;
    phone: string | null;
    reset_token: string | null;
    reset_token_expiry: Date | null;
    is_blocked: boolean | null;
    role: string;
    is_verified: boolean;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
  
  settings: {
    id: string;
    key: string;
    value: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
  
  bookings: {
    id: string;
    user_id: string;
    vehicle_id: string;
    start_date: Date;
    end_date: Date;
    total_hours: number | null;
    total_price: number;
    status: string;
    payment_status: string;
    payment_details: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    pickup_location: string | null;
    dropoff_location: string | null;
    payment_intent_id: string | null;
    booking_id: string;
    pickup_datetime: Date | null;
    dropoff_datetime: Date | null;
    formatted_start_date: string | null;
    formatted_end_date: string | null;
    formatted_pickup: string | null;
    formatted_dropoff: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    booking_type: string | null;
    created_by: string | null;
    notes: string | null;
  };
  
  vehicles: {
    id: string;
    name: string;
    type: string;
    location: string;
    quantity: number;
    price_per_hour: number;
    min_booking_hours: number;
    is_available: boolean | null;
    images: string;
    status: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    price_15_days: number | null;
    price_30_days: number | null;
    price_7_days: number | null;
  };
  
  documents: {
    id: string;
    user_id: string;
    type: string;
    status: string;
    file_url: string;
    rejection_reason: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
} 