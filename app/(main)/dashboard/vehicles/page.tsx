'use client';

import logger from '@/lib/logger';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  registration_number: string;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  created_at: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (vehicleId: string, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: isAvailable }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle availability');
      }
      
      await fetchVehicles(); // Refresh the list
      toast.success('Vehicle availability updated successfully');
    } catch (error) {
      logger.error('Error updating vehicle availability:', error);
      toast.error('Failed to update vehicle availability');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Vehicles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="relative h-48 mb-4">
              <Image
                src={vehicle.image_url || '/placeholder-vehicle.jpg'}
                alt={vehicle.name}
                fill
                className="rounded-lg object-cover"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">{vehicle.name}</h2>
            <div className="space-y-2 text-gray-600">
              <p>Brand: {vehicle.brand}</p>
              <p>Model: {vehicle.model}</p>
              <p>Year: {vehicle.year}</p>
              <p>Price per day: ₹{vehicle.price_per_day}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {vehicle.is_available ? 'Available' : 'Not Available'}
              </span>
              <Switch
                checked={vehicle.is_available}
                onCheckedChange={(checked: boolean) => handleUpdateAvailability(vehicle.id, checked)}
                className="z-50"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 