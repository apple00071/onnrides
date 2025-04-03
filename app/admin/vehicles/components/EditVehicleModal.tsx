'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VEHICLE_TYPES, VehicleType } from '@/lib/schema';
import { Vehicle } from '@/app/(main)/vehicles/types';

// Define locations
const LOCATIONS = [
  'Madhapur',
  'Eragadda'
];

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: Vehicle) => void;
  vehicle: Vehicle;
}

interface FormData {
  name: string;
  type: VehicleType;
  price_per_hour: number;
  price_7_days: number;
  price_15_days: number;
  price_30_days: number;
  location: string[];
  images: (string | File)[];
  is_available: boolean;
  quantity: number;
}

// Helper function to convert form data to Vehicle type
function convertToVehicle(formData: FormData, existingVehicle: Vehicle, imageUrls: string[]): Vehicle {
  return {
    ...existingVehicle,
    name: formData.name,
    type: formData.type,
    price_per_hour: formData.price_per_hour,
    price_7_days: formData.price_7_days > 0 ? formData.price_7_days : undefined,
    price_15_days: formData.price_15_days > 0 ? formData.price_15_days : undefined,
    price_30_days: formData.price_30_days > 0 ? formData.price_30_days : undefined,
    location: formData.location,
    images: imageUrls,
    is_available: formData.is_available,
    quantity: formData.quantity,
    min_booking_hours: existingVehicle.min_booking_hours
  };
}

export default function EditVehicleModal({ isOpen, onClose, onSuccess, vehicle }: EditVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: vehicle.name,
    type: VEHICLE_TYPES.includes(vehicle.type as VehicleType) ? (vehicle.type as VehicleType) : 'car',
    price_per_hour: vehicle.price_per_hour,
    price_7_days: vehicle.price_7_days || 0,
    price_15_days: vehicle.price_15_days || 0,
    price_30_days: vehicle.price_30_days || 0,
    location: Array.isArray(vehicle.location) ? vehicle.location : [],
    images: Array.isArray(vehicle.images) ? vehicle.images : [],
    is_available: vehicle.is_available,
    quantity: vehicle.quantity || 1,
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    const newUrls = files.map(file => URL.createObjectURL(file));
    
    setNewImages(prev => [...prev, ...files]);
    setObjectUrls(prev => [...prev, ...newUrls]);
    
    // Clear input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeNewImage = (index: number) => {
    const urlToRemove = objectUrls[index];
    URL.revokeObjectURL(urlToRemove);
    
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setObjectUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (location: string) => {
    setFormData(prev => ({
      ...prev,
      location: [...prev.location, location]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields except images
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'images') {
          if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      // Add existing images
      formData.images.forEach((image, index) => {
        if (typeof image === 'string') {
          formDataToSend.append(`existing_images[${index}]`, image);
        }
      });

      // Add new images
      newImages.forEach((image, index) => {
        formDataToSend.append(`new_images[${index}]`, image);
      });

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle');
      }

      const updatedVehicle = await response.json();
      onSuccess(updatedVehicle);
      onClose();
      toast.success('Vehicle updated successfully');
    } catch (error) {
      logger.error('Error updating vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: VehicleType) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Price per Hour</Label>
              <Input
                id="price_per_hour"
                type="number"
                value={formData.price_per_hour}
                onChange={e => setFormData(prev => ({ ...prev, price_per_hour: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_7_days">7 Days Price</Label>
              <Input
                id="price_7_days"
                type="number"
                value={formData.price_7_days}
                onChange={e => setFormData(prev => ({ ...prev, price_7_days: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_15_days">15 Days Price</Label>
              <Input
                id="price_15_days"
                type="number"
                value={formData.price_15_days}
                onChange={e => setFormData(prev => ({ ...prev, price_15_days: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_30_days">30 Days Price</Label>
              <Input
                id="price_30_days"
                type="number"
                value={formData.price_30_days}
                onChange={e => setFormData(prev => ({ ...prev, price_30_days: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Add location"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLocationChange((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.location.map((loc, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {loc}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        location: prev.location.filter((_, i) => i !== index)
                      }));
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Images</Label>
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            <div className="grid grid-cols-3 gap-4 mt-4">
              {formData.images.map((image, index) => (
                <div key={`existing-${index}`} className="relative group">
                  <img
                    src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                    alt={`Vehicle ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImages.map((_, index) => (
                <div key={`new-${index}`} className="relative group">
                  <img
                    src={objectUrls[index]}
                    alt={`New vehicle ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_available"
              checked={formData.is_available}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, is_available: checked }))}
            />
            <Label htmlFor="is_available">Available</Label>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
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