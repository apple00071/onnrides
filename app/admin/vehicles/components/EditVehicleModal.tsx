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
  DialogDescription,
} from '@/app/components/ui/dialog';
import { Vehicle, FormData } from '../types';

interface EditVehicleModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated: () => void;
}

export default function EditVehicleModal({
  vehicle,
  isOpen,
  onClose,
  onVehicleUpdated,
}: EditVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: vehicle.name,
    type: vehicle.type,
    quantity: vehicle.quantity,
    price_per_day: vehicle.price_per_day,
    location: vehicle.location,
    status: vehicle.status,
    is_available: vehicle.is_available,
    images: vehicle.images,
  });

  useEffect(() => {
    setFormData({
      name: vehicle.name,
      type: vehicle.type,
      quantity: vehicle.quantity,
      price_per_day: vehicle.price_per_day,
      location: vehicle.location,
      status: vehicle.status,
      is_available: vehicle.is_available,
      images: vehicle.images,
    });
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price_per_day' 
        ? Number(value)
        : name === 'status'
        ? value as 'active' | 'maintenance' | 'retired'
        : name === 'location'
        ? { name: value.split(',').map(loc => loc.trim()) }
        : value
    }));
  };

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vehicle Details</DialogTitle>
          <DialogDescription>
            Make changes to the vehicle information below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="price_per_day">Price per Day (₹)</Label>
            <Input
              id="price_per_day"
              name="price_per_day"
              type="number"
              value={formData.price_per_day}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <Label htmlFor="location">Locations (comma-separated)</Label>
            <Input
              id="location"
              name="location"
              value={formData.location.name.join(', ')}
              onChange={handleChange}
              required
              placeholder="e.g., Madhapur, Erragadda"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
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