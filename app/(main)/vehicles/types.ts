export interface Vehicle {
  id: string;
  name: string;
  type: string;
  price_per_hour: number;
  price_7_days?: number | null;
  price_15_days?: number | null;
  price_30_days?: number | null;
  location: string[];
  images: string[];
  quantity: number;
  min_booking_hours: number;
  is_available: boolean;
  available?: boolean;
  nextAvailable?: {
    nextAvailable: string;
    until: string | null;
  } | null;
}

export interface VehicleDetailsProps {
  vehicle: Vehicle;
}

export interface PageParams {
  vehicleId: string;
}

export interface PageProps {
  params: PageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
} 