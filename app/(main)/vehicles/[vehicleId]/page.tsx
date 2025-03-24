import { Metadata } from 'next';
import VehicleDetailsClient from './VehicleDetailsClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/${params.id}`);
  const vehicle = await response.json();

  return {
    title: vehicle?.name ? `${vehicle.name} - OnnRides` : 'Vehicle Details - OnnRides',
    description: vehicle?.description || 'Book your next ride with OnnRides',
  };
}

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
  return <VehicleDetailsClient params={params} />;
} 