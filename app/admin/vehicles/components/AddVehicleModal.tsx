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
import { Switch } from '@/components/ui/switch';
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
  is_available: boolean;
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
    is_available: true,
  } satisfies FormData;

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  const resetForm = () => {
    setFormData(defaultFormData);
    // Cleanup any existing object URLs
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    setObjectUrls([]);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    const newUrls = files.map(file => URL.createObjectURL(file));
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
    setObjectUrls(prev => [...prev, ...newUrls]);
    
    // Clear input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const urlToRemove = objectUrls[index];
    URL.revokeObjectURL(urlToRemove);
    
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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

      // Add images
      formData.images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to add vehicle');
      }

      const newVehicle = await response.json();
      onSuccess(newVehicle);
      resetForm();
      onClose();
      toast.success('Vehicle added successfully');
    } catch (error) {
      logger.error('Error adding vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add vehicle');
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
            <Label>Availability</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                aria-label="Toggle vehicle availability"
              />
              <span className="text-sm text-gray-600">
                {formData.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
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
                      src={objectUrls[index]}
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
              {loading ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}