'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '../../../../lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VEHICLE_TYPES, VEHICLE_STATUS } from '@/lib/schema';
import { Vehicle } from '@/lib/types';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: Vehicle) => void;
  vehicle: Vehicle;
}

interface FormData {
  name: string;
  type: typeof VEHICLE_TYPES[number];
  location: string[];
  price_per_hour: number;
  is_available: boolean;
  status: typeof VEHICLE_STATUS[number];
  images: File[];
  existingImages: string[];
}

export default function EditVehicleModal({ isOpen, onClose, onSuccess, vehicle }: EditVehicleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: vehicle.name,
    type: vehicle.type as typeof VEHICLE_TYPES[number],
    location: Array.isArray(vehicle.location) ? vehicle.location : vehicle.location.split(',').map(l => l.trim()),
    price_per_hour: parseFloat(vehicle.price_per_hour),
    is_available: vehicle.is_available,
    status: vehicle.status,
    images: [],
    existingImages: Array.isArray(vehicle.images) ? vehicle.images : vehicle.images.split(',').map(i => i.trim()),
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        images: [...Array.from(files)]
      }));
    }
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index)
    }));
  };

  const removeNewImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      // Prepare the data as a regular object
      const updateData = {
        name: formData.name,
        type: formData.type,
        location: formData.location,
        price_per_hour: formData.price_per_hour,
        is_available: formData.is_available,
        status: formData.status,
        images: formData.existingImages
      };

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update vehicle');
      }

      const { vehicle: updatedVehicle } = await response.json();
      toast.success('Vehicle updated successfully');
      onSuccess(updatedVehicle);
      onClose();
    } catch (error) {
      logger.error('Error updating vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              onValueChange={(value: typeof VEHICLE_TYPES[number]) => setFormData({ ...formData, type: value })}
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location.join(', ')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, location: e.target.value.split(',').map((l: string) => l.trim()) })}
              placeholder="Enter locations separated by commas"
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
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: typeof VEHICLE_STATUS[number]) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {formData.existingImages.length > 0 && (
              <div className="mt-4">
                <Label>Existing Images</Label>
                <div className="mt-2 grid grid-cols-4 gap-4">
                  {formData.existingImages.map((url, index) => (
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
                  ))}
                </div>
              </div>
            )}

            {/* New Images Preview */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <Label>New Images</Label>
                <div className="mt-2 grid grid-cols-4 gap-4">
                  {formData.images.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
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