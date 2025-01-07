export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
  is_blocked: boolean;
  is_verified: boolean;
  documents_status?: {
    approved: number;
    total: number;
  };
}

export interface Document {
  id: string;
  type: string;
  status: string;
  file_url: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  vehicle_id: number;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  created_at: string;
  vehicle: {
    name: string;
    type: string;
    image_url: string;
  };
} 