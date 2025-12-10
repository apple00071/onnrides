'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Vehicle } from '@/app/(main)/vehicles/types';
import { Select } from '@/components/ui/select';
import axios from 'axios';

// Define available locations
const AVAILABLE_LOCATIONS = ['Madhapur', 'Erragadda'] as const;
type AvailableLocation = typeof AVAILABLE_LOCATIONS[number];

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle;
  onSuccess?: () => void;
}

interface VehicleFormData {
  name: string;
  type: string;
  location: AvailableLocation[];
  quantity: string;
  price_per_hour: string;
  min_booking_hours: string;
  images: string[];
  is_delivery_enabled: boolean;
  price_7_days: string;
  price_15_days: string;
  price_30_days: string;
  delivery_price_7_days: string;
  delivery_price_15_days: string;
  delivery_price_30_days: string;
}

export function EditVehicleModal({ isOpen, onClose, vehicle, onSuccess }: EditVehicleModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    name: vehicle?.name ?? '',
    type: vehicle?.type ?? '',
    location: Array.isArray(vehicle?.location) ? vehicle.location.filter((loc): loc is AvailableLocation =>
      AVAILABLE_LOCATIONS.includes(loc as AvailableLocation)
    ) : [],
    quantity: vehicle?.quantity?.toString() ?? '0',
    price_per_hour: vehicle?.price_per_hour?.toString() ?? '0',
    min_booking_hours: vehicle?.min_booking_hours?.toString() ?? '0',
    price_7_days: vehicle?.price_7_days?.toString() ?? '0',
    price_15_days: vehicle?.price_15_days?.toString() ?? '0',
    price_30_days: vehicle?.price_30_days?.toString() ?? '0',
    images: Array.isArray(vehicle?.images) ? vehicle.images : [],
    is_delivery_enabled: vehicle?.vehicle_category === 'delivery' || vehicle?.vehicle_category === 'both',
    delivery_price_7_days: vehicle?.delivery_price_7_days?.toString() ?? '0',
    delivery_price_15_days: vehicle?.delivery_price_15_days?.toString() ?? '0',
    delivery_price_30_days: vehicle?.delivery_price_30_days?.toString() ?? '0'
  });
  const [loading, setLoading] = useState(false);
  const [locationQuantities, setLocationQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (vehicle) {
      // Parse location quantities from vehicle data
      const locQties: Record<string, number> = {};
      const locations = Array.isArray(vehicle.location) ? vehicle.location.filter((loc): loc is AvailableLocation =>
        AVAILABLE_LOCATIONS.includes(loc as AvailableLocation)
      ) : [];

      // Check if vehicle has location_quantities, otherwise distribute total quantity
      if (vehicle.location_quantities && typeof vehicle.location_quantities === 'object') {
        Object.assign(locQties, vehicle.location_quantities);
      } else if (vehicle.quantity && locations.length > 0) {
        // Fallback: distribute evenly
        const qtyPerLocation = Math.ceil(vehicle.quantity / locations.length);
        locations.forEach(loc => {
          locQties[loc] = qtyPerLocation;
        });
      }

      setLocationQuantities(locQties);

      setFormData({
        name: vehicle.name,
        type: vehicle.type,
        location: locations,
        quantity: vehicle.quantity?.toString() ?? '0',
        price_per_hour: vehicle.price_per_hour?.toString() ?? '0',
        min_booking_hours: vehicle.min_booking_hours?.toString() ?? '0',
        price_7_days: vehicle.price_7_days?.toString() ?? '0',
        price_15_days: vehicle.price_15_days?.toString() ?? '0',
        price_30_days: vehicle.price_30_days?.toString() ?? '0',
        images: Array.isArray(vehicle.images) ? vehicle.images : [],
        is_delivery_enabled: vehicle.vehicle_category === 'delivery' || vehicle.vehicle_category === 'both',
        delivery_price_7_days: vehicle.delivery_price_7_days?.toString() ?? '0',
        delivery_price_15_days: vehicle.delivery_price_15_days?.toString() ?? '0',
        delivery_price_30_days: vehicle.delivery_price_30_days?.toString() ?? '0'
      });
    }
  }, [vehicle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationChange = (location: AvailableLocation, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      location: checked
        ? [...prev.location, location]
        : prev.location.filter(l => l !== location)
    }));

    // Add default quantity for new location if not exists
    if (checked && !locationQuantities[location]) {
      setLocationQuantities(prev => ({
        ...prev,
        [location]: 1
      }));
    }
  };

  const handleImageDelete = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Function to handle image URL validation
  const isValidImageUrl = (url: string): boolean => {
    return url.trim().length > 0 && (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('/') ||
      url.startsWith('data:image/')
    );
  };

  // Function to add a new image URL
  const handleAddImageUrl = (url: string) => {
    if (!isValidImageUrl(url)) {
      toast.error('Please enter a valid image URL');
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, url]
    }));
  };

  // Function to handle image file uploads with automatic cropping (client-side)
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        continue;
      }

      try {
        toast.loading('Processing image...', { id: file.name });

        // Dynamically import to avoid SSR issues
        const { processImage } = await import('@/lib/utils/image-processing');

        const result = await processImage(file);

        handleAddImageUrl(result.dataUrl);
        toast.success(`Processed ${file.name} - whitespace removed!`, { id: file.name });
      } catch (error) {
        logger.error('Error processing file:', error);
        toast.error(`Error processing file ${file.name}`, { id: file.name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ensure images is always an array
    const images = Array.isArray(formData.images) ? formData.images : [];

    // Ensure location is properly formatted
    const location = JSON.stringify(formData.location);

    // Use location quantities from state
    const locationQuantitiesPayload: Record<string, number> = {};
    let totalQty = 0;

    formData.location.forEach((loc) => {
      const qty = locationQuantities[loc] || 0;
      locationQuantitiesPayload[loc] = qty;
      totalQty += qty;
    });

    logger.info('Updating vehicle with location quantities', {
      locations: formData.location,
      locationQuantities: locationQuantitiesPayload,
      totalQty
    });

    const payload = {
      name: formData.name,
      type: formData.type || 'bike',
      location: formData.location, // Send as array, the API will handle conversion
      quantity: totalQty, // Sum of all location quantities
      location_quantities: locationQuantitiesPayload, // Per-location breakdown
      price_per_hour: parseFloat(formData.price_per_hour),
      min_booking_hours: parseInt(formData.min_booking_hours, 10),
      images: images, // Send as array, the API will handle conversion
      is_available: true,
      status: 'active',
      is_delivery_enabled: formData.is_delivery_enabled,
      vehicle_category: formData.is_delivery_enabled ? 'both' : 'normal',
      price_7_days: formData.price_7_days ? parseFloat(formData.price_7_days) : null,
      price_15_days: formData.price_15_days ? parseFloat(formData.price_15_days) : null,
      price_30_days: formData.price_30_days ? parseFloat(formData.price_30_days) : null,
      delivery_price_7_days: formData.delivery_price_7_days ? parseFloat(formData.delivery_price_7_days) : null,
      delivery_price_15_days: formData.delivery_price_15_days ? parseFloat(formData.delivery_price_15_days) : null,
      delivery_price_30_days: formData.delivery_price_30_days ? parseFloat(formData.delivery_price_30_days) : null
    };

    try {
      // Log the payload before sending
      console.log('Sending payload to API:', JSON.stringify(payload, null, 2));

      if (vehicle?.id) {
        console.log('Updating vehicle with data:', payload);
        const response = await axios.put('/api/admin/vehicles', {
          id: vehicle.id,
          ...payload,
        });
        console.log('Update response:', response.data);
        onSuccess?.();
        onClose();
        toast.success('Vehicle saved successfully');
      } else {
        console.log('Creating vehicle with data:', payload);
        const response = await axios.post('/api/admin/vehicles', payload);
        console.log('Create response:', response.data);
        onSuccess?.();
        onClose();
        toast.success('Vehicle saved successfully');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      if (axios.isAxiosError(error)) {
        // More detailed error handling for Axios errors
        const errorMessage = error.response?.data?.error || error.message;
        console.error('API error response:', error.response?.data);
        toast.error(`Error: ${errorMessage}`);
      } else {
        toast.error('Failed to save vehicle: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Input
                value="Bike"
                disabled
                className="bg-gray-100"
              />
              <input type="hidden" name="type" value="bike" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location-madhapur"
                  checked={formData.location.includes('Madhapur')}
                  onCheckedChange={(checked) => {
                    handleLocationChange('Madhapur', checked as boolean);
                  }}
                  className="text-black border-gray-300 focus:ring-0"
                />
                <Label
                  htmlFor="location-madhapur"
                  className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                >
                  Madhapur
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location-erragadda"
                  checked={formData.location.includes('Erragadda')}
                  onCheckedChange={(checked) => {
                    handleLocationChange('Erragadda', checked as boolean);
                  }}
                  className="text-black border-gray-300 focus:ring-0"
                />
                <Label
                  htmlFor="location-erragadda"
                  className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                >
                  Erragadda
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Vehicle Images</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter image URL"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        handleAddImageUrl(input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500">or</span>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="flex-1"
                  />
                </div>
              </div>
              {formData.images.length > 0 && (
                <div className="col-span-2 grid grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt={`Vehicle preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          logger.warn('Image failed to load:', { url });
                          e.currentTarget.src = '/images/placeholder-vehicle.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Quantities Per Location</Label>
              <p className="text-xs text-gray-500 mb-2">
                Set how many vehicles are available at each selected location
              </p>
              {formData.location.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  Please select at least one location above
                </p>
              ) : (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                  {formData.location.map((loc) => (
                    <div key={loc} className="flex items-center gap-3">
                      <Label className="w-32 text-sm font-medium">{loc}:</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Quantity"
                        value={locationQuantities[loc] || 1}
                        onChange={(e) => {
                          const newQty = Number(e.target.value) || 0;
                          setLocationQuantities(prev => ({
                            ...prev,
                            [loc]: newQty
                          }));
                        }}
                        className="w-24"
                        required
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Price Per Hour (₹)</Label>
              <Input
                id="price_per_hour"
                name="price_per_hour"
                type="number"
                min="0"
                value={formData.price_per_hour}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_delivery_enabled"
              checked={formData.is_delivery_enabled}
              onCheckedChange={(checked) => {
                setFormData(prev => ({
                  ...prev,
                  is_delivery_enabled: checked as boolean
                }));
              }}
            />
            <Label
              htmlFor="is_delivery_enabled"
              className="text-sm font-medium cursor-pointer"
            >
              Enable for Delivery Partners
            </Label>
          </div>

          {/* Regular pricing section - always visible */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Regular User Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>7 Days Price</Label>
                <Input
                  type="number"
                  name="price_7_days"
                  value={formData.price_7_days}
                  onChange={handleInputChange}
                  placeholder="Enter 7 days price"
                />
              </div>
              <div className="space-y-2">
                <Label>15 Days Price</Label>
                <Input
                  type="number"
                  name="price_15_days"
                  value={formData.price_15_days}
                  onChange={handleInputChange}
                  placeholder="Enter 15 days price"
                />
              </div>
              <div className="space-y-2">
                <Label>30 Days Price</Label>
                <Input
                  type="number"
                  name="price_30_days"
                  value={formData.price_30_days}
                  onChange={handleInputChange}
                  placeholder="Enter 30 days price"
                />
              </div>
            </div>
          </div>

          {/* Delivery partner pricing section - only visible when delivery is enabled */}
          {formData.is_delivery_enabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Partner Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>7 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_7_days"
                    value={formData.delivery_price_7_days}
                    onChange={handleInputChange}
                    placeholder="Enter 7 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>15 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_15_days"
                    value={formData.delivery_price_15_days}
                    onChange={handleInputChange}
                    placeholder="Enter 15 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>30 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_30_days"
                    value={formData.delivery_price_30_days}
                    onChange={handleInputChange}
                    placeholder="Enter 30 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}