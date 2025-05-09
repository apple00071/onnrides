'use client';

import { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import logger from '@/lib/logger';
import { AddVehicleModal } from './components/AddVehicleModal';
import { EditVehicleModal } from './components/EditVehicleModal';
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
import { Vehicle, VehicleFormData } from '@/app/(main)/vehicles/types';
import { VehicleType, VehicleStatus, VEHICLE_STATUS } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { PageHeader, PageHeaderActions } from '@/components/ui/page-header';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Base64 encoded simple placeholder image
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz48cGF0aCBkPSJNMTAwIDcwQzg0LjUgNzAgNzIgODIuNSA3MiA5OEM3MiAxMTMuNSA4NC41IDEyNiAxMDAgMTI2QzExNS41IDEyNiAxMjggMTEzLjUgMTI4IDk4QzEyOCA4Mi41IDExNS41IDcwIDEwMCA3MFpNMTAwIDExNkM5MC41IDExNiA4Mi41IDEwOCA4Mi41IDk4QzgyLjUgODggOTAuNSA4MCAxMDAgODBDMTA5LjUgODAgMTE3LjUgODggMTE3LjUgOThDMTE3LjUgMTA4IDEwOS41IDExNiAxMDAgMTE2WiIgZmlsbD0iI0Q5RDlEOSIvPjwvc3ZnPg==';

// Helper function to format locations
const formatLocations = (location: string | string[]): string[] => {
  try {
    // If it's already an array, clean each item
    if (Array.isArray(location)) {
      return location.map(loc => 
        typeof loc === 'string' 
          ? loc.replace(/["\[\]]/g, '').trim() 
          : String(loc).trim()
      ).filter(Boolean);
    }
    
    // If it's a string that looks like JSON, parse it
    if (typeof location === 'string') {
      if (location.startsWith('[')) {
        try {
          const parsed = JSON.parse(location);
          return Array.isArray(parsed) 
            ? parsed.map(loc => String(loc).replace(/["\[\]]/g, '').trim()).filter(Boolean)
            : [parsed.toString().replace(/["\[\]]/g, '').trim()];
        } catch {
          // If JSON parsing fails, treat as comma-separated string
          return location
            .replace(/["\[\]]/g, '')
            .split(',')
            .map(loc => loc.trim())
            .filter(Boolean);
        }
      }
      // Handle comma-separated string
      return location
        .split(',')
        .map(loc => loc.replace(/["\[\]]/g, '').trim())
        .filter(Boolean);
    }
    
    return [];
  } catch (error) {
    logger.error('Error formatting locations:', error);
    return Array.isArray(location) ? location : [String(location)];
  }
};

function convertToVehicle(data: VehicleFormData): Vehicle {
  return {
    id: data.id || '',
    name: data.name,
    type: data.type,
    price_per_hour: Number(data.price_per_hour),
    min_booking_hours: Number(data.min_booking_hours || 1),
    is_available: Boolean(data.is_available),
    vehicle_category: data.vehicle_category || 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    next_available: null,
    location: data.location,
    images: data.images,
    quantity: Number(data.quantity),
    status: data.status,
    description: data.description || null,
    features: data.features || [],
    price_7_days: data.price_7_days,
    price_15_days: data.price_15_days,
    price_30_days: data.price_30_days,
    delivery_price_7_days: data.delivery_price_7_days,
    delivery_price_15_days: data.delivery_price_15_days,
    delivery_price_30_days: data.delivery_price_30_days
  } as Vehicle;
}

// Helper function to get valid image URL
const getValidImageUrl = (images: string | string[] | undefined): string => {
  // Debug log the input
  logger.debug('getValidImageUrl input:', { images, type: typeof images });

  // Handle undefined/null case
  if (!images) {
    logger.debug('No images provided, using placeholder');
    return PLACEHOLDER_IMAGE;
  }

  // If it's a string, try to parse it if it looks like JSON
  if (typeof images === 'string') {
    // Direct return for URLs
    if (images.startsWith('http') || images.startsWith('data:')) {
      logger.debug('Found direct URL:', images);
      return images;
    }

    // Handle empty or invalid JSON strings
    if (images.trim() === '' || images === '[]' || images === '[""]' || images === '""') {
      logger.debug('Empty or invalid JSON string, using placeholder');
      return PLACEHOLDER_IMAGE;
    }

    try {
      const parsed = JSON.parse(images);
      logger.debug('Parsed JSON:', { parsed, type: typeof parsed });

      if (!parsed || parsed.length === 0) {
        return PLACEHOLDER_IMAGE;
      }

      if (Array.isArray(parsed)) {
        const validImage = parsed.find(img => img && typeof img === 'string' && 
          (img.startsWith('http') || img.startsWith('data:')));
        if (validImage) {
          logger.debug('Found valid image in parsed array:', validImage);
          return validImage;
        }
      }

      if (typeof parsed === 'string' && 
        (parsed.startsWith('http') || parsed.startsWith('data:'))) {
        logger.debug('Found valid image in parsed string:', parsed);
        return parsed;
      }
    } catch (e) {
      logger.debug('JSON parse error:', e);
    }
  }

  // If it's an array, find the first valid URL
  if (Array.isArray(images)) {
    const validImage = images.find(img => img && typeof img === 'string' && 
      (img.startsWith('http') || img.startsWith('data:')));
    if (validImage) {
      logger.debug('Found valid image in array:', validImage);
      return validImage;
    }
  }

  logger.debug('No valid image found, using placeholder');
  return PLACEHOLDER_IMAGE;
};

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
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

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
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vehicles');
      const data = await res.json();
      
      // Check if data.vehicles exists (API returns { vehicles: [...] })
      const vehiclesData = data.vehicles || data;
      
      // Ensure we have an array to work with
      const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
      
      console.log('Fetched vehicles data:', vehiclesArray);
      
      // Normalize data to handle both camelCase and snake_case fields
      const updatedVehicles = vehiclesArray.map((vehicle: any) => ({
        ...vehicle,
        price_per_hour: vehicle.price_per_hour,
        is_available: vehicle.is_available,
        min_booking_hours: vehicle.min_booking_hours,
        created_at: vehicle.created_at || new Date().toISOString(),
        updated_at: vehicle.updated_at || new Date().toISOString(),
      }));
      
      console.log('Normalized vehicles:', updatedVehicles);
      setVehicles(updatedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete vehicle');
      }

      // Remove the vehicle from the local state
      setVehicles((prev: Vehicle[]) => prev.filter(vehicle => vehicle.id !== id));
      toast.success('Vehicle deleted successfully');
    } catch (error) {
      logger.error('Error deleting vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete vehicle');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
  };

  const handleEditSuccess = (formData: Vehicle) => {
    const updatedVehicle = {
      ...formData,
      // Ensure these are always arrays
      location: Array.isArray(formData.location) ? formData.location : [formData.location],
      images: Array.isArray(formData.images) ? formData.images : [formData.images],
      features: Array.isArray(formData.features) ? formData.features : [],
      created_at: formData.created_at,
      updated_at: new Date().toISOString()
    };

    setVehicles((prev: Vehicle[]) => 
      prev.map((v: Vehicle) => v.id === updatedVehicle.id ? updatedVehicle : v)
    );
    setEditingVehicle(null);
    toast.success('Vehicle updated successfully');
  };

  const handleVehicleAdded = (data: VehicleFormData) => {
    // Cast to any to avoid type errors with properties that may vary between interfaces
    const newVehicle = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      price_per_hour: Number(data.price_per_hour),
      price_7_days: data.price_7_days ? Number(data.price_7_days) : null,
      price_15_days: data.price_15_days ? Number(data.price_15_days) : null,
      price_30_days: data.price_30_days ? Number(data.price_30_days) : null,
      location: Array.isArray(data.location) ? data.location : [data.location],
      images: [],
      quantity: Number(data.quantity),
      min_booking_hours: Number(data.min_booking_hours),
      is_available: true,
      status: 'active',
      description: data.description || null,
      features: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      delivery_price_7_days: null,
      delivery_price_15_days: null,
      delivery_price_30_days: null,
      vehicle_category: data.vehicle_category || 'normal'
    } as Vehicle;

    setVehicles((prev: Vehicle[]) => [...prev, newVehicle]);
    setIsAddModalOpen(false);
    toast.success('Vehicle added successfully');
  };

  const handleAddClick = (_e: React.MouseEvent) => {
    _e.preventDefault();
    logger.debug('Add button clicked');
    setIsAddModalOpen(true);
    logger.debug('isAddModalOpen set to:', true);
  };

  const handleAvailabilityChange = async (vehicleId: string, is_available: boolean) => {
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle availability');
      }

      // Update local state
      setVehicles(vehicles.map((vehicle: Vehicle) => 
        vehicle.id === vehicleId 
          ? { ...vehicle, is_available } 
          : vehicle
      ));

      toast.success('Vehicle availability updated successfully');
    } catch (error) {
      console.error('Error updating vehicle availability:', error);
      toast.error('Failed to update vehicle availability');
    }
  };

  let content;
  if (loading) {
    content = (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-12 h-12 rounded-full absolute border-4 border-solid border-gray-200"></div>
          <div className="w-12 h-12 rounded-full animate-spin absolute border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex justify-center items-center h-96">
        <div className="text-red-500 bg-red-50 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  } else {
    content = (
      <div className="space-y-6">
        {/* Simple Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
          <Button
            onClick={handleAddClick}
            className="bg-[#f26e24] hover:bg-[#e05d13] text-white"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {/* Simple Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle: Vehicle) => (
            <Card key={vehicle.id} className="bg-white">
              {/* Image */}
              <div className="relative h-48 bg-gray-50">
                <Image
                  src={getValidImageUrl(vehicle.images)}
                  alt={vehicle.name}
                  fill
                  className="object-contain p-2"
                  onError={(e) => {
                    logger.warn('Image failed to load:', { vehicleId: vehicle.id, images: vehicle.images });
                    const target = e.target as HTMLImageElement;
                    target.src = PLACEHOLDER_IMAGE;
                  }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={true}
                />
                <Badge 
                  className={cn(
                    "absolute top-2 right-2",
                    vehicle.is_available
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {vehicle.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <CardContent className="p-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{vehicle.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Price per hour: ₹{vehicle.price_per_hour}
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="flex flex-wrap gap-1">
                    {formatLocations(vehicle.location).map((loc, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs"
                      >
                        {loc}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`is_available-${vehicle.id}`}
                        checked={vehicle.is_available}
                        onCheckedChange={(checked) => handleAvailabilityChange(vehicle.id, checked)}
                      />
                      <Label htmlFor={`is_available-${vehicle.id}`}>
                        {vehicle.is_available ? 'Available' : 'Not Available'}
                      </Label>
                    </div>
                    <div className="flex gap-2">
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
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${vehicle.name}? This action cannot be undone.`)) {
                            handleDelete(vehicle.id);
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Vehicles Message */}
        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No vehicles found. Add a vehicle to get started.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {content}
      {editingVehicle && (
        <EditVehicleModal
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          vehicle={editingVehicle}
        />
      )}
      {isAddModalOpen && (
        <AddVehicleModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleVehicleAdded}
        />
      )}
    </div>
  );
} 