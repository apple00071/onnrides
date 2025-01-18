import { Metadata } from 'next';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import VehicleDetailsClient from './VehicleDetailsClient';

export async function generateMetadata({ params: _params }: { params: { id: string } }): Promise<Metadata> {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, _params.id));

  return {
    title: vehicle?.name ? `${vehicle.name} - OnnRides` : 'Vehicle Details - OnnRides',
    description: 'Book your next ride with OnnRides',
  };
}

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
  return <VehicleDetailsClient params={params} />;
} 