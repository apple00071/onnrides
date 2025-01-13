'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import logger from '@/lib/logger';

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
    location: [] as string[],
    quantity: 1,
    price_per_day: 0,
    is_available: true,
    status: 'available' as const,
    image_url: '',
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

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add vehicle');
      }

      toast.success('Vehicle added successfully');
      onVehicleAdded();
      resetForm();
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Car',
      location: [],
      quantity: 1,
      price_per_day: 0,
      is_available: true,
      status: 'available',
      image_url: '',
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
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26e24] focus:ring-[#f26e24]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26e24] focus:ring-[#f26e24]"
              required
            >
              <option value="Car">Car</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.location.includes('Eragadda')}
                  onChange={() => handleLocationChange('Eragadda')}
                  className="rounded border-gray-300 text-[#f26e24] focus:ring-[#f26e24]"
                />
                <span className="ml-2">Eragadda</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.location.includes('Madhapur')}
                  onChange={() => handleLocationChange('Madhapur')}
                  className="rounded border-gray-300 text-[#f26e24] focus:ring-[#f26e24]"
                />
                <span className="ml-2">Madhapur</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26e24] focus:ring-[#f26e24]"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price per Day (₹)</label>
            <input
              type="number"
              value={formData.price_per_day}
              onChange={(e) => setFormData({ ...formData, price_per_day: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26e24] focus:ring-[#f26e24]"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Image</label>
            <div className="mt-1 flex items-center">
              <label className="cursor-pointer bg-[#f26e24] text-white px-4 py-2 rounded-md hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]">
                Choose File
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
              <span className="ml-3 text-sm text-gray-500">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 