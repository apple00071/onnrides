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
  images: string[];
}

export default function EditVehicleModal({ isOpen, onClose, onSuccess, vehicle }: EditVehicleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: vehicle.name,
    type: vehicle.type,
    location: Array.isArray(vehicle.location) ? vehicle.location : vehicle.location.split(',').map(l => l.trim()),
    price_per_hour: parseFloat(vehicle.price_per_hour),
    is_available: vehicle.is_available,
    status: vehicle.status,
    images: Array.isArray(vehicle.images) ? vehicle.images : vehicle.images.split(',').map(i => i.trim()),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      logger.debug('Updating vehicle with data:', formData);

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      toast.error(error instanceof Error ? error.message : 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
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
            <Label htmlFor="images">Image URLs</Label>
            <Input
              id="images"
              name="images"
              value={formData.images.join(', ')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, images: e.target.value.split(',').map((url: string) => url.trim()) })}
              placeholder="Enter image URLs separated by commas"
            />
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