export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  is_blocked: boolean;
  role: string;
  created_at: string;
}

export interface UserDocument {
  id: string;
  type: string;
  status: string;
  document_url: string;
  created_at: string;
}

export interface Booking {
  id: string;
  vehicle: {
    id: string;
    name: string;
    type: string;
    image_url: string;
  };
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
} 