'use client';

import { useState } from 'react';
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

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleAdded: () => void;
}

export default function AddVehicleModal({ isOpen, onClose, onVehicleAdded }: AddVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Car',
    quantity: 1,
    price_per_day: 0,
    price_12hrs: 0,
    price_24hrs: 0,
    price_7days: 0,
    price_15days: 0,
    price_30days: 0,
    min_booking_hours: 12,
    location: {
      name: ['Madhapur'],
    },
    status: 'active',
    images: [] as string[],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Handle file upload first if a file is selected
      let imageUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          images: imageUrl ? [imageUrl] : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add vehicle');
      }

      toast.success('Vehicle added successfully');
      onVehicleAdded();
      resetForm();
    } catch (error) {
      logger.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Car',
      quantity: 1,
      price_per_day: 0,
      price_12hrs: 0,
      price_24hrs: 0,
      price_7days: 0,
      price_15days: 0,
      price_30days: 0,
      min_booking_hours: 12,
      location: {
        name: ['Madhapur'],
      },
      status: 'active',
      images: [],
    });
    setSelectedFile(null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Fill in the vehicle information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicle-type">Type</Label>
            <select
              id="vehicle-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
            </select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Pricing Structure</h3>
            
            {/* Weekday Pricing (Mon-Wed) */}
            <div className="space-y-2">
              <Label>Weekday Pricing (Mon-Wed)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_12hrs" className="text-xs text-gray-500">
                    12 Hours Price (₹) - Minimum charge for bookings under 12 hours
                  </Label>
                  <Input
                    id="price_12hrs"
                    name="price_12hrs"
                    type="number"
                    value={formData.price_12hrs}
                    onChange={(e) => setFormData({ ...formData, price_12hrs: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price_24hrs" className="text-xs text-gray-500">
                    24 Hours Price (₹) - For bookings between 12-24 hours
                  </Label>
                  <Input
                    id="price_24hrs"
                    name="price_24hrs"
                    type="number"
                    value={formData.price_24hrs}
                    onChange={(e) => setFormData({ ...formData, price_24hrs: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Weekend Pricing (Thu-Sun) */}
            <div>
              <Label>Weekend Pricing (Thu-Sun)</Label>
              <div>
                <Label htmlFor="price_per_day" className="text-xs text-gray-500">
                  24 Hours Price (₹) - Minimum charge for any duration
                </Label>
                <Input
                  id="price_per_day"
                  name="price_per_day"
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Extended Duration Pricing */}
            <div className="space-y-2">
              <Label>Extended Duration Pricing</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price_7days" className="text-xs text-gray-500">
                    7 Days Fixed Price (₹)
                  </Label>
                  <Input
                    id="price_7days"
                    name="price_7days"
                    type="number"
                    value={formData.price_7days}
                    onChange={(e) => setFormData({ ...formData, price_7days: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price_15days" className="text-xs text-gray-500">
                    15 Days Fixed Price (₹)
                  </Label>
                  <Input
                    id="price_15days"
                    name="price_15days"
                    type="number"
                    value={formData.price_15days}
                    onChange={(e) => setFormData({ ...formData, price_15days: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price_30days" className="text-xs text-gray-500">
                    30 Days Fixed Price (₹)
                  </Label>
                  <Input
                    id="price_30days"
                    name="price_30days"
                    type="number"
                    value={formData.price_30days}
                    onChange={(e) => setFormData({ ...formData, price_30days: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
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
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
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
            <Label htmlFor="image">Image</Label>
            <div className="mt-1 flex items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image')?.click()}
              >
                Choose File
              </Button>
              <input
                id="image"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="ml-3 text-sm text-gray-500">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>
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
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 