'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { VEHICLE_TYPES, VehicleType } from '@/lib/schema';
import { Vehicle } from '@/app/(main)/vehicles/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: Vehicle) => void;
}

interface FormData {
  name: string;
  type: VehicleType;
  location: string[];
  quantity: number;
  price_per_hour: number;
  price_7_days: number;
  price_15_days: number;
  price_30_days: number;
  images: File[];
}

const LOCATIONS = [
  'Madhapur',
  'Eragadda'
];

export default function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const defaultFormData = {
    name: '',
    type: 'car' as const,
    location: [] as string[],
    quantity: 1,
    price_per_hour: 0,
    price_7_days: 0,
    price_15_days: 0,
    price_30_days: 0,
    images: [] as File[],
  } satisfies FormData;

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...filesArray]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
      // Validate required fields
      if (!formData.name || !formData.type || !formData.price_per_hour || formData.location.length === 0) {
        throw new Error('Please fill in all required fields');
      }

      let uploadedImageUrls: string[] = [];
      
      // Only attempt image upload if there are images
      if (formData.images.length > 0) {
        try {
          // First, upload all images
          uploadedImageUrls = await Promise.all(
            formData.images.map(async (file) => {
              const uploadFormData = new FormData();
              uploadFormData.append('file', file);
              
              const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
              });
              
              if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.error || 'Failed to upload image');
              }
              
              const uploadData = await uploadResponse.json();
              return uploadData.url;
            })
          );
        } catch (uploadError) {
          logger.error('Error uploading images:', uploadError);
          throw new Error(`Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      const createData = {
        name: formData.name,
        type: formData.type,
        price_per_hour: Number(formData.price_per_hour),
        price_7_days: Number(formData.price_7_days),
        price_15_days: Number(formData.price_15_days),
        price_30_days: Number(formData.price_30_days),
        location: formData.location,
        quantity: formData.quantity,
        images: uploadedImageUrls,
        min_booking_hours: 1,
        status: 'active'
      };

      logger.info('Creating vehicle with data:', createData);

      const vehicleResponse = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      if (!vehicleResponse.ok) {
        const errorData = await vehicleResponse.json();
        throw new Error(`Vehicle creation failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await vehicleResponse.json();

      if (!result.data?.vehicle) {
        throw new Error('Invalid response from server: Missing vehicle data');
      }

      toast.success('Vehicle created successfully');
      onSuccess(result.data.vehicle);
      resetForm(); // Reset form after successful submission
      onClose();
    } catch (error) {
      logger.error('Error in vehicle creation process:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">Vehicle Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Vehicle Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: VehicleType) => setFormData({ ...formData, type: value })}
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
            <div className="grid grid-cols-2 gap-4 mt-2 max-h-[200px] overflow-y-auto pr-4">
              {LOCATIONS.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={location}
                    checked={formData.location.includes(location)}
                    onCheckedChange={() => handleLocationChange(location)}
                  />
                  <Label htmlFor={location}>{location}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, price_per_hour: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price_7_days">7 Days Price</Label>
              <Input
                id="price_7_days"
                name="price_7_days"
                type="number"
                min={0}
                step={0.01}
                value={formData.price_7_days}
                onChange={(e) => setFormData({ ...formData, price_7_days: Number(e.target.value) })}
              />
              <p className="text-sm text-gray-500 mt-1">Optional: Set special price for 7 days</p>
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
                onChange={(e) => setFormData({ ...formData, price_15_days: Number(e.target.value) })}
              />
              <p className="text-sm text-gray-500 mt-1">Optional: Set special price for 15 days</p>
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
                onChange={(e) => setFormData({ ...formData, price_30_days: Number(e.target.value) })}
              />
              <p className="text-sm text-gray-500 mt-1">Optional: Set special price for 30 days</p>
            </div>
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
            
            {formData.images.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {formData.images.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white pt-4 border-t flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}