import { Metadata } from 'next';
import VehicleDetailsClient from './VehicleDetailsClient';
import { BookVehicleForm } from '@/app/(main)/BookVehicleForm';

// Define metadata for SEO
export async function generateMetadata({ params }: { params: { vehicleId: string } }): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?id=${params.vehicleId}`, { cache: 'no-store' });
    const vehicle = await response.json();

    return {
      title: `Rent ${vehicle.name} | OnnRides`,
      description: `Rent ${vehicle.name} starting at ₹${vehicle.price_per_hour}/hour. ${vehicle.description}`,
    };
  } catch (error) {
    return {
      title: 'Vehicle Details | OnnRides',
      description: 'Find your perfect ride with OnnRides rental services.',
    };
  }
}

export default async function VehicleDetailsPage({ params }: { params: { vehicleId: string } }) {
  try {
    // Server-side fetch vehicle details
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?id=${params.vehicleId}`, { 
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch vehicle details');
    }
    
    const vehicle = await response.json();
    
    // Ensure price is coming correctly
    const price = Number(vehicle.price_per_hour || vehicle.pricePerHour || 0);
    
    // Parse locations - ensuring it's an array
    let locations = [];
    try {
      locations = Array.isArray(vehicle.location)
        ? vehicle.location
        : typeof vehicle.location === 'string'
          ? JSON.parse(vehicle.location)
          : [];
    } catch (e) {
      locations = typeof vehicle.location === 'string' ? [vehicle.location] : [];
    }
    
    return (
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VehicleDetailsClient params={params} />
          </div>
          <div className="lg:col-span-1">
            <BookVehicleForm 
              vehicleId={params.vehicleId} 
              locations={locations} 
              price={price} 
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">Failed to load vehicle details</p>
        </div>
      </div>
    );
  }
} 