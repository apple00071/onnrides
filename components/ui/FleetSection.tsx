'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import logger from '@/lib/logger';

interface Vehicle {
  id: string;
  title: string;
  image: string;
  description: string;
  price_per_hour: number;
  price_7_days: number;
  price_15_days: number;
  price_30_days: number;
  type: string;
}

// Default vehicles data structure
const defaultVehicles: Vehicle[] = [
  {
    id: '1',
    title: "Shine",
    image: "",
    description: "Shine",
    type: "bike",
    price_per_hour: 20,
    price_7_days: 2399,
    price_15_days: 4199,
    price_30_days: 6499
  },
  {
    id: '2',
    title: "Passion Pro",
    image: "",
    description: "Passion Pro",
    type: "bike",
    price_per_hour: 25,
    price_7_days: 2399,
    price_15_days: 4199,
    price_30_days: 6499
  },
  {
    id: '3',
    title: "Vespa",
    image: "",
    description: "Vespa",
    type: "scooter",
    price_per_hour: 30,
    price_7_days: 2399,
    price_15_days: 4199,
    price_30_days: 6499
  },
  {
    id: '4',
    title: "Activa 6G",
    image: "",
    description: "Activa 6G",
    type: "scooter",
    price_per_hour: 42,
    price_7_days: 2399,
    price_15_days: 4199,
    price_30_days: 6499
  }
];

export default function FleetSection() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles?limit=4&featured=true');
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        
        logger.info('Raw API response:', data);
        
        // Transform the data to match our needs
        const transformedVehicles = data.map((vehicle: any) => {
          const transformed = {
            id: vehicle.id,
            title: vehicle.name,
            image: Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : "",
            description: vehicle.description,
            type: vehicle.type,
            price_per_hour: vehicle.price_per_hour,
            price_7_days: vehicle.price_7_days || defaultVehicles.find(v => v.id === vehicle.id)?.price_7_days,
            price_15_days: vehicle.price_15_days || defaultVehicles.find(v => v.id === vehicle.id)?.price_15_days,
            price_30_days: vehicle.price_30_days || defaultVehicles.find(v => v.id === vehicle.id)?.price_30_days
          };
          logger.info('Transformed vehicle:', transformed);
          return transformed;
        });
        
        logger.info('All transformed vehicles:', transformedVehicles);
        setVehicles(transformedVehicles);
      } catch (error) {
        logger.error('Error fetching vehicles:', error);
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleImageError = (vehicleId: string) => {
    logger.error(`Image load error for vehicle ${vehicleId}`);
    setImageError(prev => ({
      ...prev,
      [vehicleId]: true
    }));
  };

  const PlaceholderSVG = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <svg
        className="w-24 h-24 text-gray-300"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19 15v4H5v-4h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 18.5c-.82 0-1.5-.67-1.5-1.5s.68-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19 5v4H5V5h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 8.5c-.82 0-1.5-.67-1.5-1.5S6.18 5.5 7 5.5s1.5.67 1.5 1.5S7.83 8.5 7 8.5z"/>
      </svg>
    </div>
  );

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 h-[300px] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (vehicles.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Our Fleet</h2>
          <p className="text-gray-600">Unable to load vehicles at this time. Please try again later.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Our Fleet</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Choose from our well-maintained bikes and scooters to suit your needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-sm overflow-hidden group">
              <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
                {(!vehicle.image || imageError[vehicle.id]) ? (
                  <PlaceholderSVG />
                ) : (
                  <div className="relative w-[80%] h-[80%]">
                    <Image
                      src={vehicle.image}
                      alt={vehicle.title}
                      fill
                      className="object-contain"
                      priority
                      onError={() => handleImageError(vehicle.id)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      unoptimized={true}
                    />
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{vehicle.title}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">7 Days:</span>
                    <span className="font-semibold">₹{vehicle.price_7_days}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">15 Days:</span>
                    <span className="font-semibold">₹{vehicle.price_15_days}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">30 Days:</span>
                    <span className="font-semibold">₹{vehicle.price_30_days}</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited Kilometers</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Zero Deposit</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 