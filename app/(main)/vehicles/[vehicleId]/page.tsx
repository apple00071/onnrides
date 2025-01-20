import { Metadata } from 'next';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import BookingForm from './components/BookingForm';
import Image from 'next/image';

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-video relative rounded-lg overflow-hidden">
            {vehicle.images[0] && (
              <Image
                src={vehicle.images[0]}
                alt={vehicle.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {vehicle.images.slice(1).map((image, index) => (
              <div key={index} className="aspect-video relative rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt={`${vehicle.name} ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
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
              <p className="text-sm text-gray-500">
                Minimum booking: {vehicle.min_booking_hours} {vehicle.min_booking_hours === 1 ? 'hour' : 'hours'}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Location</h2>
            <p>{vehicle.location.join(', ')}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Book Now</h2>
            <BookingForm
              vehicleId={vehicle.id}
              pricePerHour={Number(vehicle.price_per_hour)}
              minBookingHours={vehicle.min_booking_hours}
              vehicleName={vehicle.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 