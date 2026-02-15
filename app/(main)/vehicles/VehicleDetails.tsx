import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/currency';

interface VehicleDetailsProps {
  params: {
    vehicleId: string;
  };
}

export default async function VehicleDetails({ params }: VehicleDetailsProps) {
  const result = await query(
    'SELECT * FROM vehicles WHERE id = $1',
    [params.vehicleId]
  );

  if (!result.rows || result.rows.length === 0) {
    notFound();
  }

  const vehicle = result.rows[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-96">
          <Image
            src={vehicle.image_url || '/images/placeholder.jpg'}
            alt={vehicle.name}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.name}</h1>
            <p className="text-gray-600 mt-2">{vehicle.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Transmission</h3>
              <p>{vehicle.transmission}</p>
            </div>
            <div>
              <h3 className="font-semibold">Fuel Type</h3>
              <p>{vehicle.fuel_type}</p>
            </div>
            <div>
              <h3 className="font-semibold">Mileage</h3>
              <p>{vehicle.mileage} km/l</p>
            </div>
            <div>
              <h3 className="font-semibold">Seating Capacity</h3>
              <p>{vehicle.seating_capacity} persons</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">{formatCurrency(vehicle.price_per_day)}/day</h2>
          </div>

          <Link
            href={`/booking-summary?vehicleId=${vehicle.id}`}
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
} 