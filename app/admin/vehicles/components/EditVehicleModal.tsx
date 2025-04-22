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

// Define available locations
const AVAILABLE_LOCATIONS = ['Madhapur', 'Erragadda'] as const;
type AvailableLocation = typeof AVAILABLE_LOCATIONS[number];

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onSuccess: (vehicle: Vehicle) => void;
}

interface VehicleFormData {
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  images: string[];
  is_available: boolean;
  description: string;
}

export function EditVehicleModal({ isOpen, onClose, vehicle, onSuccess }: EditVehicleModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    name: vehicle?.name ?? '',
    type: vehicle?.type ?? '',
    location: Array.isArray(vehicle?.location) ? vehicle.location : [],
    quantity: Number(vehicle?.quantity) || 0,
    price_per_hour: Number(vehicle?.price_per_hour) || 0,
    min_booking_hours: Number(vehicle?.min_booking_hours) || 1,
    price_7_days: vehicle?.price_7_days ? Number(vehicle.price_7_days) : null,
    price_15_days: vehicle?.price_15_days ? Number(vehicle.price_15_days) : null,
    price_30_days: vehicle?.price_30_days ? Number(vehicle.price_30_days) : null,
    images: Array.isArray(vehicle?.images) ? vehicle.images : [],
    is_available: vehicle?.is_available ?? true,
    description: vehicle?.description ?? ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name,
        type: vehicle.type,
        location: Array.isArray(vehicle.location) ? vehicle.location.filter((loc): loc is AvailableLocation => 
          AVAILABLE_LOCATIONS.includes(loc as AvailableLocation)
        ) : [],
        quantity: Number(vehicle.quantity) || 1,
        price_per_hour: Number(vehicle.price_per_hour) || 0,
        min_booking_hours: Number(vehicle.min_booking_hours) || 1,
        price_7_days: vehicle.price_7_days ? Number(vehicle.price_7_days) : null,
        price_15_days: vehicle.price_15_days ? Number(vehicle.price_15_days) : null,
        price_30_days: vehicle.price_30_days ? Number(vehicle.price_30_days) : null,
        description: vehicle.description || '',
        images: Array.isArray(vehicle.images) ? vehicle.images : [],
        is_available: vehicle.is_available ?? true
      });
    }
  }, [vehicle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      const numericValue = value === '' ? null : Number(value);
      setFormData(prev => {
        const updatedData = { ...prev };
        switch (name) {
          case 'price_7_days':
          case 'price_15_days':
          case 'price_30_days':
            updatedData[name] = numericValue;
            break;
          case 'quantity':
          case 'price_per_hour':
          case 'min_booking_hours':
            updatedData[name] = numericValue ?? 0;
            break;
        }
        return updatedData;
      });
    } else {
      setFormData(prev => {
        const updatedData = { ...prev };
        switch (name) {
          case 'name':
          case 'type':
          case 'description':
            updatedData[name] = value;
            break;
          case 'is_available':
            updatedData.is_available = value === 'true';
            break;
        }
        return updatedData;
      });
    }
  };

  const handleLocationChange = (location: AvailableLocation, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      location: checked 
        ? [...prev.location, location]
        : prev.location.filter(l => l !== location)
    }));
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

  // Function to handle image file uploads
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Here you would typically upload the files to your storage service
    // For now, we'll convert them to data URLs as a temporary solution
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        continue;
      }

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            handleAddImageUrl(dataUrl);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        logger.error('Error reading file:', error);
        toast.error(`Error processing file ${file.name}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert form data to match the API expectations
      const vehicleData = {
        ...formData,
        price_per_hour: Number(formData.price_per_hour),
        quantity: Number(formData.quantity),
        min_booking_hours: Number(formData.min_booking_hours),
        price_7_days: formData.price_7_days ? Number(formData.price_7_days) : null,
        price_15_days: formData.price_15_days ? Number(formData.price_15_days) : null,
        price_30_days: formData.price_30_days ? Number(formData.price_30_days) : null
      };

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update vehicle');
      }

      const result = await response.json();
      
      if (result.success && result.data.vehicle) {
        // Call onSuccess with the updated vehicle data
        onSuccess(result.data.vehicle);
        onClose();
        toast.success('Vehicle updated successfully');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      logger.error('Error updating vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update vehicle');
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
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_7_days">7 Days Price (₹)</Label>
              <Input
                id="price_7_days"
                name="price_7_days"
                type="number"
                min="0"
                value={formData.price_7_days === null ? '' : formData.price_7_days}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_15_days">15 Days Price (₹)</Label>
              <Input
                id="price_15_days"
                name="price_15_days"
                type="number"
                min="0"
                value={formData.price_15_days === null ? '' : formData.price_15_days}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_30_days">30 Days Price (₹)</Label>
              <Input
                id="price_30_days"
                name="price_30_days"
                type="number"
                min="0"
                value={formData.price_30_days === null ? '' : formData.price_30_days}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

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