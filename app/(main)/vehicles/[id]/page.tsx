
import VehicleDetailsClient from './VehicleDetailsClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  
  

  return {
    title: vehicle?.name ? `${vehicle.name} - OnnRides` : 'Vehicle Details - OnnRides',
    description: vehicle?.description || 'Book your next ride with OnnRides',
  };
}

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
  return <VehicleDetailsClient params={params} />;
} 