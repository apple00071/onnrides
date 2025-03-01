'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VEHICLE_TYPES, VehicleType } from '../../../../lib/schema';
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
  const [formData, setFormData] = useState<FormData>({
    name: vehicle.name,
    type: vehicle.type as VehicleType,
    price_per_hour: vehicle.price_per_hour,
    price_7_days: vehicle.price_7_days || 0,
    price_15_days: vehicle.price_15_days || 0,
    price_30_days: vehicle.price_30_days || 0,
    location: Array.isArray(vehicle.location) ? vehicle.location : [vehicle.location],
    images: Array.isArray(vehicle.images) ? vehicle.images : [],
    is_available: vehicle.is_available,
    quantity: vehicle.quantity || 1
  });
  const [loading, setLoading] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files);
      setNewImages(prev => [...prev, ...filesArray]);
    }
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (location: string) => {
    setFormData(prev => ({
      ...prev,
      location: prev.location.includes(location)
        ? prev.location.filter(l => l !== location)
        : [...prev.location, location]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, upload any new images
      const uploadedImageUrls = await Promise.all(
        newImages.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload image');
          }
          
          const data = await response.json();
          return data.url;
        })
      );

      // Combine existing images with new uploaded ones
      const allImages = [...formData.images.filter(img => typeof img === 'string'), ...uploadedImageUrls];

      // Prepare update data with special pricing
      const updateData = {
        id: vehicle.id,
        name: formData.name,
        type: formData.type,
        price_per_hour: Number(formData.price_per_hour),
        price_7_days: formData.price_7_days || null,
        price_15_days: formData.price_15_days || null,
        price_30_days: formData.price_30_days || null,
        location: formData.location,
        images: allImages,
        is_available: formData.is_available,
        quantity: formData.quantity
      };

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle');
      }

      const updatedVehicle = await response.json();
      
      onSuccess(updatedVehicle.data.vehicle);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">Vehicle Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Vehicle Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: string) => setFormData({ ...formData, type: value as VehicleType })}
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

          <div>
            <Label>Locations</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {LOCATIONS.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location}`}
                    checked={formData.location.includes(location)}
                    onCheckedChange={() => handleLocationChange(location)}
                  />
                  <label
                    htmlFor={`location-${location}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {location}
                  </label>
                </div>
              ))}
            </div>
            {formData.location.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Please select at least one location
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, quantity: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="price_per_hour">Price (Per Hour)</Label>
            <Input
              id="price_per_hour"
              name="price_per_hour"
              type="number"
              min={0}
              step={0.01}
              value={formData.price_per_hour}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, price_per_hour: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="price_7_days">7 Days Price</Label>
            <Input
              id="price_7_days"
              name="price_7_days"
              type="number"
              min={0}
              step={0.01}
              value={formData.price_7_days}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, price_7_days: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="price_15_days">15 Days Price</Label>
            <Input
              id="price_15_days"
              name="price_15_days"
              type="number"
              min={0}
              step={0.01}
              value={formData.price_15_days}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, price_15_days: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="price_30_days">30 Days Price</Label>
            <Input
              id="price_30_days"
              name="price_30_days"
              type="number"
              min={0}
              step={0.01}
              value={formData.price_30_days}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, price_30_days: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="images">Vehicle Images</Label>
            <Input
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="mt-1"
            />
            
            {/* Existing Images */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <Label>Existing Images</Label>
                <div className="mt-2 grid grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    typeof url === 'string' && (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* New Images Preview */}
            {newImages.length > 0 && (
              <div className="mt-4">
                <Label>New Images</Label>
                <div className="mt-2 grid grid-cols-4 gap-4">
                  {newImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="sticky bottom-0 bg-white pt-4 border-t flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || formData.location.length === 0}
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 