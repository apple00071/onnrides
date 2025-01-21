import { Metadata } from 'next';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import VehicleImages from './components/VehicleImages';
import BookingForm from './components/BookingForm';

export async function generateMetadata({ params }: { params: { vehicleId: string } }): Promise<Metadata> {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, params.vehicleId));

  return {
    title: vehicle?.name ? `${vehicle.name} - OnnRides` : 'Vehicle Details - OnnRides',
    description: 'Book your next ride with OnnRides',
  };
}

interface VehiclePageProps {
  params: {
    vehicleId: string;
  };
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { vehicleId } = params;

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);

  if (!vehicle) {
    notFound();
  }

  // Parse images from JSON string and ensure it's an array
  let images: string[] = [];
  try {
    const parsedImages = JSON.parse(vehicle.images);
    images = Array.isArray(parsedImages) ? parsedImages : [parsedImages];
    console.log('Vehicle images:', images); // For debugging
  } catch (error) {
    console.error('Error parsing vehicle images:', error);
    console.log('Raw images string:', vehicle.images); // For debugging
  }

  // Validate image URLs
  images = images.filter(url => {
    try {
      new URL(url);
      return true;
    } catch {
      console.error('Invalid image URL:', url);
      return false;
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <VehicleImages images={images} vehicleName={vehicle.name} />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.name}</h1>
            <p className="text-gray-500">{vehicle.type}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Pricing</h2>
            <div className="space-y-2">
              <p className="text-lg">
                <span className="font-medium">Per Hour:</span>{' '}
                ₹{Number(vehicle.price_per_hour).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Location</h2>
            <p>{Array.isArray(vehicle.location) ? vehicle.location.join(', ') : vehicle.location}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Book Now</h2>
            <BookingForm
              vehicleId={vehicle.id}
              pricePerHour={Number(vehicle.price_per_hour)}
              vehicleName={vehicle.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 