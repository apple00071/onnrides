import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface Vehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  category: string;
  available: boolean;
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-white shadow-md transition-all hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
        <Image
          src={vehicle.image}
          alt={vehicle.name}
          width={400}
          height={400}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{vehicle.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{vehicle.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg font-bold text-primary">
            ${vehicle.price.toFixed(2)}/day
          </p>
          <Button asChild variant="default" size="sm">
            <Link href={`/bikes/${vehicle.id}`}>
              View Details
            </Link>
          </Button>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            vehicle.available 
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {vehicle.available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
} 