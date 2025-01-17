'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '../../../../lib/logger';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price_per_day: number;
  location: {
    name: string[];
  };
  status: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

interface EditVehicleModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated: () => void;
}

export default function EditVehicleModal({ vehicle, isOpen, onClose, onVehicleUpdated }: EditVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Vehicle>(vehicle);

  useEffect(() => {
    setFormData(vehicle);
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/vehicles?id=${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update vehicle');
      }

      toast.success('Vehicle updated successfully');
      onVehicleUpdated();
    } catch (error) {
      logger.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationName: string) => {
    const currentLocations = formData.location.name;
    const updatedLocations = currentLocations.includes(locationName)
      ? currentLocations.filter(name => name !== locationName)
      : [...currentLocations, locationName];
    
    setFormData({
      ...formData,
      location: { name: updatedLocations }
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicle-type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              required
            >
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
            </Select>
          </div>

          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>

          <div>
            <Label>Price per day (₹)</Label>
            <Input
              type="number"
              value={formData.price_per_day}
              onChange={(e) => setFormData({ ...formData, price_per_day: parseInt(e.target.value) })}
              required
              min="0"
            />
          </div>

          <div>
            <Label>Locations</Label>
            <div className="space-y-2 mt-1">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="location-madhapur"
                  checked={formData.location.name.includes('Madhapur')}
                  onChange={() => handleLocationChange('Madhapur')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="location-madhapur" className="text-sm text-gray-700">
                  Madhapur
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="location-erragadda"
                  checked={formData.location.name.includes('Erragadda')}
                  onChange={() => handleLocationChange('Erragadda')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="location-erragadda" className="text-sm text-gray-700">
                  Erragadda
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <Label>Image</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Choose File
            </Button>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const formData = new FormData();
                  formData.append('file', e.target.files[0]);
                  
                  try {
                    const response = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    if (!response.ok) throw new Error('Upload failed');
                    
                    const data = await response.json();
                    setFormData(prev => ({ ...prev, images: [...prev.images, data.url] }));
                  } catch (error) {
                    toast.error('Failed to upload image');
                    logger.error('Error uploading image:', error);
                  }
                }
              }}
              className="hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 