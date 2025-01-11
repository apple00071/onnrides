'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  is_available: boolean;
  status: string;
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      setVehicles(data);
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold mb-6">Vehicles Management</h1>
      {/* Rest of your JSX */}
    </div>
  );
} 