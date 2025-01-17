'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '@/lib/logger';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price_per_day: number;
  location: string[];
  images: string[];
  is_available: boolean;
  status: 'active' | 'maintenance' | 'deleted';
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
      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Vehicle</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <FaTimes className="w-5 h-5" />
          </Button>
        </div>

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
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.location.includes('Eragadda')}
                  onCheckedChange={(checked) => {
                    const locations = checked 
                      ? [...formData.location, 'Eragadda']
                      : formData.location.filter(loc => loc !== 'Eragadda');
                    setFormData({ ...formData, location: locations });
                  }}
                />
                <Label>Eragadda</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.location.includes('Madhapur')}
                  onCheckedChange={(checked) => {
                    const locations = checked 
                      ? [...formData.location, 'Madhapur']
                      : formData.location.filter(loc => loc !== 'Madhapur');
                    setFormData({ ...formData, location: locations });
                  }}
                />
                <Label>Madhapur</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Image</Label>
            <Button
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

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'maintenance' | 'deleted' })}
              required
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="deleted">Deleted</option>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_available}
              onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
            />
            <Label>Available</Label>
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
      </div>
    </div>
  );
} 