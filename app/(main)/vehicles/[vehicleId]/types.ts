export interface Vehicle {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price_per_day: number;
  transmission: string;
  fuel_type: string;
  mileage: number;
  seating_capacity: number;
}

export interface VehicleDetailsProps {
  vehicle: Vehicle;
}

export interface PageParams {
  id: string;
}

export interface PageProps {
  params: PageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
} 