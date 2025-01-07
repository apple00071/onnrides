import { Suspense } from 'react';
import VehiclesList from './components/VehiclesList';
import Loading from './loading';

export default async function VehiclesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VehiclesList />
    </Suspense>
  );
} 