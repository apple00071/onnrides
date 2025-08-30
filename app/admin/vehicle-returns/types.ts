export interface VehicleReturn {
  id: string;
  booking_id: string;
  return_date: string;
  condition_notes?: string;
  damages: string[];
  additional_charges: number;
  odometer_reading?: number;
  fuel_level?: number;
  status: 'pending' | 'completed' | 'disputed';
  processed_by: string;
  processed_by_name?: string;
  created_at: string;
  updated_at: string;
  
  // Related data
  booking_id_display?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  user_name?: string;
  user_email?: string;
}

export interface VehicleReturnFormData {
  booking_id: string;
  condition_notes: string;
  damages: string[];
  additional_charges: number;
  odometer_reading: number;
  fuel_level: number;
  status: 'pending' | 'completed' | 'disputed';
} 