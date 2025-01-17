'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '@/lib/logger';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';

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
    location: [] as string[],
    images: [] as string[],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleLocationChange = (location: string) => {
    setFormData(prev => {
      const newLocations = prev.location.includes(location)
        ? prev.location.filter(loc => loc !== location)
        : [...prev.location, location];
      return { ...prev, location: newLocations };
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

      // Convert locations array to an object with location names as keys
      const locationObject = formData.location.reduce((acc, loc) => {
        acc[loc] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          location: locationObject,
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
      location: [],
      images: [],
    });
    setSelectedFile(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Vehicle</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

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

          <div>
            <Label htmlFor="price">Price per Day (₹)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price_per_day}
              onChange={(e) => setFormData({ ...formData, price_per_day: parseInt(e.target.value) })}
              required
              min="0"
            />
          </div>

          <div>
            <Label>Locations</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="eragadda"
                  checked={formData.location.includes('Eragadda')}
                  onCheckedChange={() => handleLocationChange('Eragadda')}
                />
                <Label htmlFor="eragadda">Eragadda</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="madhapur"
                  checked={formData.location.includes('Madhapur')}
                  onCheckedChange={() => handleLocationChange('Madhapur')}
                />
                <Label htmlFor="madhapur">Madhapur</Label>
              </div>
            </div>
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
      </div>
    </div>
  );
} 