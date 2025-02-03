import { Metadata } from 'next';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import BookingForm from '../components/BookingForm';

export async function generateMetadata({ params }: { params: { vehicleId: string } }): Promise<Metadata> {
  const result = await query(
    'SELECT name FROM vehicles WHERE id = $1',
    [params.vehicleId]
  );

  if (!result.rows || result.rows.length === 0) {
    return {
      title: 'Vehicle Not Found - OnnRides',
      description: 'The requested vehicle could not be found.',
    };
  }

  return {
    title: `Book ${result.rows[0].name} - OnnRides`,
    description: 'Complete your booking with OnnRides',
  };
}

interface BookingPageProps {
  params: {
    vehicleId: string;
  };
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { vehicleId } = params;

  const result = await query(
    'SELECT * FROM vehicles WHERE id = $1',
    [vehicleId]
  );

  if (!result.rows || result.rows.length === 0) {
    notFound();
  }

  const vehicle = result.rows[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Book {vehicle.name}</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <BookingForm
            vehicleId={vehicle.id}
            pricePerHour={Number(vehicle.price_per_hour)}
            vehicleName={vehicle.name}
          />
        </div>
      </div>
    </div>
  );
} 