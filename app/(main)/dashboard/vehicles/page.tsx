'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

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
      const response = await fetch('/api/user/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (vehicleId: string, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/user/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_available: isAvailable })
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle availability');
      }

      toast.success('Vehicle availability updated');
      fetchVehicles(); // Refresh the list
    } catch (error) {
      console.error('Error:', error);
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
      <h1 className="text-2xl font-bold mb-6">My Vehicles</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={vehicle.image_url}
                        alt={vehicle.name}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vehicle.type}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {vehicle.brand} {vehicle.model} {vehicle.year}
                  </div>
                  <div className="text-sm text-gray-500">
                    {vehicle.color} • {vehicle.registration_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{vehicle.price_per_day}/day
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    vehicle.is_available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vehicle.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() =>
                      handleToggleAvailability(vehicle.id, !vehicle.is_available)
                    }
                    className={`text-${
                      vehicle.is_available ? 'red' : 'green'
                    }-600 hover:text-${
                      vehicle.is_available ? 'red' : 'green'
                    }-900`}
                  >
                    {vehicle.is_available ? 'Mark Unavailable' : 'Mark Available'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 