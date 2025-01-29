import { logger } from '@/lib/logger';
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '../../../../lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { VEHICLE_TYPES } from '@/lib/schema';
import { Vehicle } from '@/lib/types';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: Vehicle) => void;
}

interface FormData {
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_hour: number;
  images: File[];
}

const LOCATIONS = [
  'Eragadda',
  'Madhapur'
];

export default function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'car',
    location: [],
    quantity: 1,
    price_per_hour: 0,
    images: [],
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData({ ...formData, images: filesArray });
    }
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

    try {
      setLoading(true);
      logger.debug('Submitting vehicle data:', formData);

      // First, upload images
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
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

      // Then create vehicle with image URLs
      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: imageUrls,
          price_per_hour: formData.price_per_hour.toString(),
          min_booking_hours: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create vehicle');
      }

      toast.success('Vehicle created successfully');
      onSuccess(data.vehicle);
      onClose();
      setFormData({
        name: '',
        type: 'car',
        location: [],
        quantity: 1,
        price_per_hour: 0,
        images: [],
      });
    } catch (error) {
      logger.error('Error creating vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Vehicle</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>
        
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
              onValueChange={(value: string) => setFormData({ ...formData, type: value })}
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
            <div className="grid grid-cols-2 gap-4 mt-2">
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
            <Label htmlFor="images">Upload Images</Label>
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
              <div className="mt-2 grid grid-cols-4 gap-2">
                {Array.from(formData.images).map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [...formData.images];
                        newImages.splice(index, 1);
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Vehicle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 