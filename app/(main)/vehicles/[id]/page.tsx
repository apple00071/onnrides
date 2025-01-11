import VehicleDetailsClient from './VehicleDetailsClient';
import { Metadata } from 'next';
import prisma from '../../../lib/prisma';

export async function generateMetadata({ params: _params }: { params: { id: string } }): Promise<Metadata> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: _params.id }
  });

  return {
    title: vehicle?.name ? `${vehicle.name} - OnnRides` : 'Vehicle Details - OnnRides',
    description: vehicle?.description || 'Book your next ride with OnnRides',
  };
}

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
  return <VehicleDetailsClient params={params} />;
} 