'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Image from 'next/image';
import logger from '../../../lib/logger';
import AddVehicleModal from './components/AddVehicleModal';
import EditVehicleModal from './components/EditVehicleModal';
import { Button } from '@/app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Vehicle } from './types';

export default function VehiclesPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/admin/login');
    },
  });
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchVehicles();
  }, [session, status, router]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch vehicles');
      }
      
      // Ensure vehicles array exists
      if (!data.vehicles || !Array.isArray(data.vehicles)) {
        console.error('Invalid vehicles data received:', data);
        setVehicles([]);
        return;
      }

      // Ensure vehicles have the correct shape
      const formattedVehicles = data.vehicles.map((vehicle: any) => ({
        id: vehicle.id || '',
        name: vehicle.name || '',
        type: vehicle.type || '',
        quantity: vehicle.quantity || 0,
        price_per_day: vehicle.price_per_day || 0,
        status: String(vehicle.status || 'active'),
        images: Array.isArray(vehicle.images) ? vehicle.images : [],
        location: typeof vehicle.location === 'object' 
          ? vehicle.location 
          : { name: typeof vehicle.location === 'string' ? [vehicle.location] : [] }
      }));

      setVehicles(formattedVehicles);
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      toast.error('Failed to fetch vehicles');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`/api/admin/vehicles?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete vehicle');
      }

      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error) {
      logger.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete vehicle');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleVehicleUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  const handleVehicleAdded = () => {
    setIsAddModalOpen(false);
    fetchVehicles();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicles Management</h1>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center"
        >
          <FaPlus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price/Day</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="relative h-12 w-12">
                    {vehicle.images?.[0] ? (
                      <Image
                        src={vehicle.images[0]}
                        alt={vehicle.name}
                        fill
                        className="object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-vehicle.jpg';
                        }}
                      />
                    ) : (
                      <Image
                        src="/placeholder-vehicle.jpg"
                        alt={vehicle.name}
                        fill
                        className="object-cover rounded"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>{vehicle.name}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{vehicle.quantity}</TableCell>
                <TableCell>
                  {formatCurrency(vehicle.price_per_day)}
                </TableCell>
                <TableCell>
                  {(() => {
                    try {
                      if (Array.isArray(vehicle.location)) {
                        return vehicle.location.join(', ');
                      } else if (typeof vehicle.location === 'object' && vehicle.location.name) {
                        return vehicle.location.name.join(', ');
                      } else if (typeof vehicle.location === 'string') {
                        const locations = JSON.parse(vehicle.location);
                        return Array.isArray(locations) ? locations.join(', ') : vehicle.location;
                      }
                      return String(vehicle.location);
                    } catch (e) {
                      return String(vehicle.location);
                    }
                  })()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vehicle.status === 'active'
                        ? 'default'
                        : vehicle.status === 'maintenance'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {String(vehicle.status).charAt(0).toUpperCase() + String(vehicle.status).slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <FaEdit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <FaTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVehicleAdded={handleVehicleAdded}
      />

      {selectedVehicle && (
        <EditVehicleModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVehicle(null);
          }}
          onVehicleUpdated={handleVehicleUpdated}
          vehicle={selectedVehicle}
        />
      )}
    </div>
  );
} 