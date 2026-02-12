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
import { toast } from 'sonner';
import { PageHeader, PageHeaderActions } from '@/components/ui/page-header';
import Image from 'next/image';
import { Search, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getBadgeColor } from '@/lib/constants/status-colors';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { CardGridSkeleton } from '@/components/admin/LoadingSkeletons';

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

    // If it's a string, try to parse it if it looks like JSON
    if (typeof location === 'string') {
      const trimmed = location.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          const array = Array.isArray(parsed) ? parsed : [parsed];
          return array.map(loc => String(loc).replace(/["\[\]]/g, '').trim()).filter(Boolean);
        } catch {
          // Fallback to comma separation
        }
      }
      return trimmed
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
    delivery_price_30_days: data.delivery_price_30_days,
    zero_deposit: data.zero_deposit
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
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Filter states
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Bulk selection handlers
  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles((prev: string[]) =>
      prev.includes(vehicleId)
        ? prev.filter((id: string) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const toggleSelectAll = (filteredVehicles: Vehicle[]) => {
    if (selectedVehicles.length === filteredVehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(filteredVehicles.map(v => v.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVehicles.length === 0) return;

    try {
      const response = await fetch('/api/admin/vehicles/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleIds: selectedVehicles })
      });

      if (response.ok) {
        toast.success(`${selectedVehicles.length} vehicles deleted`);
        setSelectedVehicles([]);
        fetchVehicles();
      } else {
        toast.error('Failed to delete vehicles');
      }
    } catch (error) {
      toast.error('Error deleting vehicles');
    }
  };

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

  const handleEditSuccess = () => {
    fetchVehicles();
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
      const response = await fetch('/api/admin/vehicles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: vehicleId, is_available }),
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
    content = <CardGridSkeleton count={6} />;
  } else if (error) {
    content = (
      <div className="flex justify-center items-center h-96">
        <div className="text-red-500 bg-red-50 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  } else {
    // Filter vehicles based on selected filters
    const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          vehicle.name.toLowerCase().includes(query) ||
          (vehicle.brand?.toLowerCase().includes(query)) ||
          (vehicle.model?.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Availability filter
      if (availabilityFilter === 'available' && !vehicle.is_available) return false;
      if (availabilityFilter === 'unavailable' && vehicle.is_available) return false;

      // Location filter
      if (locationFilter !== 'all') {
        const vehicleLocations = formatLocations(vehicle.location);
        if (!vehicleLocations.includes(locationFilter)) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && vehicle.type !== typeFilter) return false;

      // Brand filter
      if (brandFilter !== 'all' && vehicle.brand !== brandFilter) return false;

      return true;
    });

    // Get unique types and brands for filters
    const vehicleTypes = Array.from(new Set(vehicles.map((v: Vehicle) => v.type).filter(Boolean))).sort();
    const vehicleBrands = Array.from(new Set(vehicles.map((v: Vehicle) => v.brand).filter(Boolean))).sort();
    const allLocations = Array.from(new Set(vehicles.flatMap((v: Vehicle) => formatLocations(v.location)))).sort();

    content = (
      <div className="space-y-6">
        {/* Mobile Header (Visible only on mobile) */}
        <div className="md:hidden mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Vehicles</h1>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                {filteredVehicles.length} vehicles found
              </p>
            </div>
            <Button
              onClick={handleAddClick}
              className="bg-[#f26e24] hover:bg-[#e05d13] text-white shadow-sm h-9 px-4"
            >
              <FaPlus className="w-3.5 h-3.5 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Desktop Header Actions (Hidden on Mobile) */}
        <div className="hidden md:flex justify-end mb-6">
          <Button
            onClick={handleAddClick}
            className="bg-[#f26e24] hover:bg-[#e05d13] text-white shadow-sm"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedVehicles.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedVehicles([])}
              />
              <span className="font-medium text-blue-900">
                {selectedVehicles.length} vehicle{selectedVehicles.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVehicles([])}
              >
                Clear Selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        {/* Filters & Search */}
        <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50">
              <Checkbox
                id="select-all"
                checked={selectedVehicles.length === filteredVehicles.length && filteredVehicles.length > 0}
                onCheckedChange={() => toggleSelectAll(filteredVehicles)}
                className="border-gray-300"
              />
              <Label htmlFor="select-all" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                Select All ({filteredVehicles.length})
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Brand</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {vehicleBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {allLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-start pt-2">
              <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-xl w-full sm:w-auto gap-0.5">
                <button
                  onClick={() => setAvailabilityFilter('all')}
                  className={cn(
                    "px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all",
                    availabilityFilter === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setAvailabilityFilter('available')}
                  className={cn(
                    "px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all",
                    availabilityFilter === 'available' ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Available
                </button>
                <button
                  onClick={() => setAvailabilityFilter('unavailable')}
                  className={cn(
                    "px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all",
                    availabilityFilter === 'unavailable' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Unavailable
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Showing {filteredVehicles.length} of {vehicles.length} vehicles
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle: Vehicle) => (
            <Card key={vehicle.id} className="bg-white border border-gray-200 rounded-lg shadow-sm relative">
              {/* Bulk Select Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedVehicles.includes(vehicle.id)}
                  onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                  className="rounded-md border-gray-300 bg-white/50 backdrop-blur-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all shadow-sm"
                />
              </div>
              {/* Image */}
              <div className="relative h-44 bg-gray-50/50">
                <Image
                  src={getValidImageUrl(vehicle.images)}
                  alt={vehicle.name}
                  fill
                  className="object-contain p-4 mix-blend-multiply"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    logger.warn('Image failed to load:', { vehicleId: vehicle.id, images: vehicle.images });
                    const target = e.target as HTMLImageElement;
                    target.src = PLACEHOLDER_IMAGE;
                  }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={true}
                />
                <Badge
                  className={`absolute top-2 right-2 border-0 shadow-sm font-bold text-[10px] uppercase tracking-wider ${vehicle.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {vehicle.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <CardContent className="p-3 md:p-4">
                {/* Status Indicators */}
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                    {vehicle.location_quantities && Object.keys(vehicle.location_quantities).length > 0 ? (
                      <span>
                        QTY: {Object.entries(vehicle.location_quantities).map(([loc, qty], idx) => (
                          <span key={loc}>
                            {idx > 0 && ' | '}
                            {loc.charAt(0)}: {qty}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>QTY: {vehicle.quantity}</span>
                    )}
                    <span>•</span>
                    <span>Min: {vehicle.min_booking_hours}h</span>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{vehicle.name}</h3>
                      <p className="text-xs font-semibold text-gray-400 capitalize mt-0.5">{vehicle.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-gray-900 tracking-tight">
                        ₹{vehicle.price_per_hour}/hr
                      </div>
                      {vehicle.price_7_days && (
                        <div className="text-[10px] font-bold text-gray-400">
                          ₹{vehicle.price_7_days}/week
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="flex flex-wrap gap-1">
                    {formatLocations(vehicle.location).map((loc, index) => (
                      <span
                        key={index}
                        className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200/50"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <Switch
                          id={`is_available-${vehicle.id}`}
                          checked={vehicle.is_available}
                          onCheckedChange={(checked: boolean) => handleAvailabilityChange(vehicle.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                      <Label
                        htmlFor={`is_available-${vehicle.id}`}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          vehicle.is_available ? "text-green-600" : "text-gray-400"
                        )}
                      >
                        {vehicle.is_available ? 'Online' : 'Offline'}
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                        className="h-8 px-3 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setVehicleToDelete(vehicle.id)}
                        className="h-8 px-3 text-xs bg-red-500 hover:bg-red-600 text-white"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {vehicles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No vehicles found. Add a vehicle to get started.</p>
            </div>
          )}
        </div>
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
      <DeleteConfirmationDialog
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={() => vehicleToDelete && handleDelete(vehicleToDelete)}
        title="Delete Vehicle?"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
      />
      <DeleteConfirmationDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedVehicles.length} Vehicles?`}
        description={`Are you sure you want to delete ${selectedVehicles.length} vehicles? This action cannot be undone.`}
      />
    </div>
  );
} 