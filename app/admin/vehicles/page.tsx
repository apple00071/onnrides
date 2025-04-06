'use client';

import { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import logger from '@/lib/logger';
import AddVehicleModal from './components/AddVehicleModal';
import EditVehicleModal from './components/EditVehicleModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Vehicle } from '@/app/(main)/vehicles/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { PageHeader, PageHeaderActions } from '@/components/ui/page-header';

// Helper function to format locations
function formatLocations(location: string | string[] | undefined): string[] {
  if (!location) return [];
  
  if (typeof location === 'string') {
    try {
      return JSON.parse(location);
    } catch {
      return [location];
    }
  }
  
  return location;
}

// Helper function to convert API vehicle to UI vehicle format
function convertToVehicle(data: any): Vehicle {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    price_per_hour: parseFloat(data.price_per_hour),
    price_7_days: data.price_7_days ? parseFloat(data.price_7_days) : null,
    price_15_days: data.price_15_days ? parseFloat(data.price_15_days) : null,
    price_30_days: data.price_30_days ? parseFloat(data.price_30_days) : null,
    location: formatLocations(data.location),
    images: Array.isArray(data.images) 
      ? data.images 
      : (data.images ? [data.images] : []),
    quantity: data.quantity || 1,
    min_booking_hours: data.min_booking_hours || 1,
    is_available: data.is_available === true || data.is_available === 'true',
    available: data.is_available === true || data.is_available === 'true',
  };
}

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
      setVehicles(data.vehicles.map(convertToVehicle));
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete vehicle');
      }

      toast.success('Vehicle deleted successfully');
      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (error) {
      logger.error('Error deleting vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete vehicle');
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

  const handleAvailabilityChange = async (vehicle: Vehicle, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...vehicle,
          is_available: isAvailable
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle availability');
      }

      // Update local state
      setVehicles(vehicles.map(v => 
        v.id === vehicle.id ? { ...v, is_available: isAvailable } : v
      ));

      toast.success('Vehicle availability updated successfully');
    } catch (error) {
      logger.error('Error updating vehicle availability:', error);
      toast.error('Failed to update vehicle availability');
    }
  };

  let content;
  if (loading) {
    content = (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex justify-center items-center h-96">
        <div className="text-red-500">{error}</div>
      </div>
    );
  } else {
    content = (
      <div className="w-full max-w-none overflow-hidden">
        <PageHeader title="Vehicles Management" className="w-full">
          <PageHeaderActions>
            <Button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center font-goodtimes"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </PageHeaderActions>
        </PageHeader>

        <div className="bg-white rounded-lg shadow overflow-hidden w-full max-w-none">
          <div className="w-full overflow-x-auto">
            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead className="w-[15%]">Name</TableHead>
                  <TableHead className="w-[10%]">Type</TableHead>
                  <TableHead className="w-[10%]">Price/Hour</TableHead>
                  <TableHead className="w-[25%]">Locations</TableHead>
                  <TableHead className="w-[10%]">Available</TableHead>
                  <TableHead className="w-[15%]">Actions</TableHead>
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
                    <TableCell>
                      <span className="text-base text-gray-900">
                        {vehicle.name}
                      </span>
                    </TableCell>
                    <TableCell>{vehicle.type}</TableCell>
                    <TableCell>{formatCurrency(vehicle.price_per_hour)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {formatLocations(vehicle.location).map((loc, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {loc}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={vehicle.is_available}
                          onCheckedChange={(checked) => handleAvailabilityChange(vehicle, checked as boolean)}
                          aria-label="Toggle vehicle availability"
                        />
                        <span className="text-sm text-gray-600">
                          {vehicle.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                          className="font-goodtimes"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                          className="font-goodtimes"
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