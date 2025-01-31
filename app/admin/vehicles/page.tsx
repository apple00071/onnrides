'use client';

import { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import logger from '../../../lib/logger';
import AddVehicleModal from './components/AddVehicleModal';
import EditVehicleModal from './components/EditVehicleModal';
import { Button } from '../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency } from '../../../lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Vehicle } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    logger.debug('Add Modal State:', isAddModalOpen);
  }, [isAddModalOpen]);

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
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data.vehicles);
    } catch (_error) {
      setError(_error instanceof Error ? _error.message : 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete vehicle');
      }

      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (_error) {
      logger.error('Error deleting vehicle:', _error);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicles(vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const handleVehicleAdded = (newVehicle: Vehicle) => {
    setVehicles([...vehicles, newVehicle]);
  };

  const handleAddClick = (_e: React.MouseEvent) => {
    _e.preventDefault();
    logger.debug('Add button clicked');
    setIsAddModalOpen(true);
    logger.debug('isAddModalOpen set to:', true);
  };

  let content;
  if (status === 'loading' || loading) {
    content = (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  } else if (!session || session.user.role !== 'admin') {
    content = null;
  } else if (error) {
    content = (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchVehicles}>Retry</Button>
        </div>
      </div>
    );
  } else if (vehicles.length === 0) {
    content = (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Vehicles Management</h1>
          <Button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow p-8">
          <p className="text-gray-500 mb-4">No vehicles found</p>
          <p className="text-sm text-gray-400">Click the "Add Vehicle" button above to add your first vehicle</p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Vehicles Management</h1>
          <Button
            type="button"
            onClick={handleAddClick}
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
                <TableHead>Price/Hour</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    {vehicle.images && (
                      Array.isArray(vehicle.images) && vehicle.images[0] ? (
                        <img
                          src={vehicle.images[0]}
                          alt={vehicle.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : typeof vehicle.images === 'string' ? (
                        <img
                          src={vehicle.images}
                          alt={vehicle.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500">No image</span>
                        </div>
                      )
                    )}
                  </TableCell>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell className="capitalize">{vehicle.type}</TableCell>
                  <TableCell>{formatCurrency(vehicle.price_per_hour)}</TableCell>
                  <TableCell>
                    {typeof vehicle.location === 'string' 
                      ? vehicle.location.split(', ').map((loc) => (
                        <span
                          key={loc}
                          className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                        >
                          {loc}
                        </span>
                      ))
                      : Array.isArray(vehicle.location) && vehicle.location.map((loc) => (
                        <span
                          key={loc}
                          className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                        >
                          {loc}
                        </span>
                      ))
                    }
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold",
                        {
                          "bg-green-100 text-green-800": vehicle.status === "active",
                          "bg-yellow-100 text-yellow-800": vehicle.status === "maintenance",
                          "bg-red-100 text-red-800": vehicle.status === "retired"
                        }
                      )}
                    >
                      {vehicle.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(vehicle.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleVehicleAdded}
      />
      {selectedVehicle && (
        <EditVehicleModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVehicle(null);
          }}
          onSuccess={handleVehicleUpdated}
          vehicle={selectedVehicle}
        />
      )}
    </>
  );
} 