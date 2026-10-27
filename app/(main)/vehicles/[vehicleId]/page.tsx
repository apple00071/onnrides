import { Metadata } from 'next';
import VehicleDetailsClient from './VehicleDetailsClient';
import { BookVehicleForm } from '@/app/(main)/BookVehicleForm';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

// Helper function to clean locations
function cleanLocationData(locationData: any): string[] {
  try {
    // Case 1: If it's already an array
    if (Array.isArray(locationData)) {
      return locationData.map(loc => {
        if (typeof loc === 'string') {
          // Remove any square brackets, quotes, and trim whitespace
          return loc.replace(/[\[\]"']/g, '').trim();
        }
        return String(loc).replace(/[\[\]"']/g, '').trim();
      }).filter(Boolean); // Remove any empty strings
    }
    
    // Case 2: If it's a string
    if (typeof locationData === 'string') {
      // Check if it's a JSON string
      if (locationData.includes('[') || locationData.includes('"')) {
        try {
          const parsed = JSON.parse(locationData);
          if (Array.isArray(parsed)) {
            return parsed.map(loc => {
              if (typeof loc === 'string') {
                return loc.replace(/[\[\]"']/g, '').trim();
              }
              return String(loc).replace(/[\[\]"']/g, '').trim();
            }).filter(Boolean);
          } else {
            return [String(parsed).replace(/[\[\]"']/g, '').trim()];
          }
        } catch (e) {
          // If JSON parsing fails, clean the string directly
          if (locationData.match(/^\[.*\]$/)) {
            // Remove brackets and split by commas
            const cleanedStr = locationData.replace(/^\[|\]$/g, '').trim();
            return cleanedStr.split(',').map(s => 
              s.replace(/[\[\]"']/g, '').trim()
            ).filter(Boolean);
          } 
          // Simple string - just clean it
          return [locationData.replace(/[\[\]"']/g, '').trim()];
        }
      } else {
        // Regular string - just clean it
        return [locationData.trim()];
      }
    }
    
    // Default case
    return [];
  } catch (error) {
    logger.error('Error cleaning location data:', error);
    return [];
  }
}

// Define metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ vehicleId: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const result = await query(
      'SELECT id, name, price_per_hour, type FROM vehicles WHERE id = $1',
      [resolvedParams.vehicleId]
    );

    if (result.rowCount && result.rows[0]) {
      const vehicle = result.rows[0];
      const title = `Rent ${vehicle.name} in Hyderabad | Mister Rides`;
      const description = `Rent ${vehicle.name} in Hyderabad starting at ₹${vehicle.price_per_hour || 199}/hour. Doorstep delivery, verified bikes & affordable rates.`;

      return {
        title,
        description,
        alternates: {
          canonical: `/vehicles/${vehicle.id}`,
        },
        openGraph: {
          title,
          description,
          url: `https://misterrides.com/vehicles/${vehicle.id}`,
          images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: vehicle.name }],
        },
      };
    }
  } catch (error) {
    logger.error('Error generating vehicle metadata:', error);
  }

  return {
    title: 'Vehicle Details | Mister Rides',
    description: 'Find your perfect ride with Mister Rides rental services.',
  };
}

export default async function VehicleDetailsPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    const resolvedParams = await params;
    const result = await query(
      'SELECT * FROM vehicles WHERE id = $1',
      [resolvedParams.vehicleId]
    );
    
    if (!result.rowCount || !result.rows[0]) {
      throw new Error('Failed to fetch vehicle details');
    }
    
    const vehicle = result.rows[0];
    
    // Ensure price is coming correctly
    const price = Number(vehicle.price_per_hour || vehicle.pricePerHour || 0);
    
    // Use our helper function to clean location data
    const locations = cleanLocationData(vehicle.location);
    
    // Log the cleaned locations for debugging
    console.log('Cleaned locations:', locations);
    
    return (
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VehicleDetailsClient params={resolvedParams} />
          </div>
          <div className="lg:col-span-1">
            <BookVehicleForm
              vehicleId={resolvedParams.vehicleId}
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