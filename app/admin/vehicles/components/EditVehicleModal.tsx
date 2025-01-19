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
import type { Vehicle, FormData } from '../types';

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
  const [formData, setFormData] = useState<FormData>(() => ({
    name: vehicle.name,
    type: vehicle.type,
    quantity: vehicle.quantity,
    price_per_day: vehicle.price_per_day,
    price_12hrs: vehicle.price_12hrs,
    price_24hrs: vehicle.price_24hrs,
    price_7days: vehicle.price_7days,
    price_15days: vehicle.price_15days,
    price_30days: vehicle.price_30days,
    min_booking_hours: vehicle.min_booking_hours,
    location: {
      name: (() => {
        try {
          if (Array.isArray(vehicle.location)) {
            return vehicle.location;
          } else if (typeof vehicle.location === 'object' && 'name' in vehicle.location) {
            return (vehicle.location as { name: string[] }).name;
          } else if (typeof vehicle.location === 'string') {
            const locations = JSON.parse(vehicle.location);
            return Array.isArray(locations) ? locations : [vehicle.location];
          }
          return [String(vehicle.location)];
        } catch (e) {
          return [String(vehicle.location)];
        }
      })()
    },
    status: vehicle.status,
    is_available: vehicle.is_available,
    images: vehicle.images || []
  }));

  useEffect(() => {
    setFormData({
      name: vehicle.name,
      type: vehicle.type,
      quantity: vehicle.quantity,
      price_per_day: vehicle.price_per_day,
      price_12hrs: vehicle.price_12hrs,
      price_24hrs: vehicle.price_24hrs,
      price_7days: vehicle.price_7days,
      price_15days: vehicle.price_15days,
      price_30days: vehicle.price_30days,
      min_booking_hours: vehicle.min_booking_hours,
      location: {
        name: (() => {
          try {
            if (Array.isArray(vehicle.location)) {
              return vehicle.location;
            } else if (typeof vehicle.location === 'object' && 'name' in vehicle.location) {
              return (vehicle.location as { name: string[] }).name;
            } else if (typeof vehicle.location === 'string') {
              const locations = JSON.parse(vehicle.location);
              return Array.isArray(locations) ? locations : [vehicle.location];
            }
            return [String(vehicle.location)];
          } catch (e) {
            return [String(vehicle.location)];
          }
        })()
      },
      status: vehicle.status,
      is_available: vehicle.is_available,
      images: vehicle.images || []
    });
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'location') {
      const locations = value.split(',')
        .map(loc => loc.trim())
        .filter(Boolean);
      
      setFormData(prev => ({
        ...prev,
        location: {
          name: locations
        }
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name.startsWith('price_') || name === 'min_booking_hours'
        ? Number(value)
        : name === 'is_available'
        ? value === 'true'
        : name === 'status'
        ? value as 'active' | 'maintenance' | 'retired'
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        location: {
          name: Array.isArray(formData.location.name) 
            ? formData.location.name 
            : [formData.location.name]
        }
      };

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            {/* Type */}
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min={1}
                className="mt-1"
              />
            </div>

            {/* Price 12hrs */}
            <div>
              <Label htmlFor="price_12hrs">Price (12 Hours)</Label>
              <Input
                type="number"
                id="price_12hrs"
                name="price_12hrs"
                value={formData.price_12hrs}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Price 24hrs */}
            <div>
              <Label htmlFor="price_24hrs">Price (24 Hours)</Label>
              <Input
                type="number"
                id="price_24hrs"
                name="price_24hrs"
                value={formData.price_24hrs}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Price per day */}
            <div>
              <Label htmlFor="price_per_day">Price (Per Day)</Label>
              <Input
                type="number"
                id="price_per_day"
                name="price_per_day"
                value={formData.price_per_day}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Price 7 days */}
            <div>
              <Label htmlFor="price_7days">Price (7 Days)</Label>
              <Input
                type="number"
                id="price_7days"
                name="price_7days"
                value={formData.price_7days}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Price 15 days */}
            <div>
              <Label htmlFor="price_15days">Price (15 Days)</Label>
              <Input
                type="number"
                id="price_15days"
                name="price_15days"
                value={formData.price_15days}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Price 30 days */}
            <div>
              <Label htmlFor="price_30days">Price (30 Days)</Label>
              <Input
                type="number"
                id="price_30days"
                name="price_30days"
                value={formData.price_30days}
                onChange={handleChange}
                required
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Locations (comma-separated)</Label>
              <Input
                type="text"
                id="location"
                name="location"
                value={formData.location.name.join(', ')}
                onChange={handleChange}
                required
                placeholder="e.g., Madhapur, Erragadda"
                className="mt-1"
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
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