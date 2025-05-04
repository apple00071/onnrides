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
    
    // Parse and format locations - ensuring it's a clean array of strings
    let locations: string[] = [];
    
    // Handle different types of location data
    if (vehicle.location) {
      // Case 1: Already an array
      if (Array.isArray(vehicle.location)) {
        locations = vehicle.location.map((loc: any) => {
          if (typeof loc === 'string') {
            // Remove any quotes or brackets and trim
            return loc.replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
          }
          return String(loc).trim();
        }).filter(Boolean);
      } 
      // Case 2: String that might be JSON
      else if (typeof vehicle.location === 'string') {
        const locationStr = vehicle.location as string;
        
        // Try to parse if it looks like JSON
        if (locationStr.includes('[') || locationStr.includes('"')) {
          try {
            const parsed = JSON.parse(locationStr);
            if (Array.isArray(parsed)) {
              // Parse worked - clean each location
              locations = parsed.map(loc => {
                if (typeof loc === 'string') {
                  return loc.replace(/^["']+|["']+$/g, '').trim();
                }
                return String(loc).trim();
              }).filter(Boolean);
            } else {
              // JSON parsed but not an array - wrap as single item
              locations = [String(parsed).replace(/^["']+|["']+$/g, '').trim()];
            }
          } catch (e) {
            // JSON parsing failed - treat as plain string
            // First check if it looks like ["something"]
            if (locationStr.match(/^\[.*\]$/)) {
              // Remove brackets and split by commas
              const cleanedStr = locationStr.replace(/^\[|\]$/g, '').trim();
              locations = cleanedStr.split(',').map(s => 
                s.replace(/^["']+|["']+$/g, '').trim()
              ).filter(Boolean);
            } else {
              // Simple string - just clean it
              locations = [locationStr.replace(/^["']+|["']+$/g, '').trim()];
            }
          }
        } else {
          // Regular string - just add it
          locations = [locationStr.trim()];
        }
      }
    }
    
    // Log the cleaned locations for debugging
    console.log('Cleaned locations:', locations);
    
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