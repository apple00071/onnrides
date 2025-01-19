import { Metadata } from 'next';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import VehicleDetailsClient from './VehicleDetailsClient';
import { notFound } from 'next/navigation';

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

export default async function VehiclePage({
  params: { vehicleId },
}: {
  params: { vehicleId: string };
}) {
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
      <VehicleDetailsClient vehicle={vehicle} />
    </div>
  );
} 