'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { VEHICLE_TYPES, VehicleType } from '@/lib/schema';
import { VehicleFormData } from '@/app/(main)/vehicles/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { LOCATIONS } from '@/lib/locations';

// Define available locations
const AVAILABLE_LOCATIONS = ['Madhapur', 'Erragadda'] as const;
type AvailableLocation = typeof AVAILABLE_LOCATIONS[number];

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: VehicleFormData) => void;
}

interface FormData {
  name: string;
  type: string;
  location: AvailableLocation[];
  quantity: string;
  price_per_hour: string;
  min_booking_hours: string;
  images: string[];
  is_delivery_enabled: boolean;
  price_7_days?: string;
  price_15_days?: string;
  price_30_days?: string;
  delivery_price_7_days?: string;
  delivery_price_15_days?: string;
  delivery_price_30_days?: string;
}

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'bike',
    location: [] as AvailableLocation[],
    quantity: '1',
    price_per_hour: '50',
    min_booking_hours: '1',
    images: [],
    is_delivery_enabled: false,
    price_7_days: '',
    price_15_days: '',
    price_30_days: '',
    delivery_price_7_days: '',
    delivery_price_15_days: '',
    delivery_price_30_days: ''
  });

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Ensure the form has the correct initial values when opened
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        type: 'bike'
      }));
    }
  }, [isOpen]);

  // Function to handle image URL validation
  const isValidImageUrl = (url: string): boolean => {
    return url.trim().length > 0 && (
      url.startsWith('http://') || 
      url.startsWith('https://') || 
      url.startsWith('/') || 
      url.startsWith('data:image/')
    );
  };

  // Function to add a new image URL
  const handleAddImageUrl = (url: string) => {
    if (!isValidImageUrl(url)) {
      toast.error('Please enter a valid image URL');
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, url]
    }));
    setImageUrls(prev => [...prev, url]);
  };

  // Function to handle image file uploads
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Here you would typically upload the files to your storage service
    // For now, we'll convert them to data URLs as a temporary solution
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        continue;
      }

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            handleAddImageUrl(dataUrl);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        logger.error('Error reading file:', error);
        toast.error(`Error processing file ${file.name}`);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (location: AvailableLocation, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      location: checked 
        ? [...prev.location, location]
        : prev.location.filter(l => l !== location)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Client-side validation with detailed logging
      console.log('Form data before validation:', JSON.stringify(formData, null, 2));
      
      if (!formData.name) {
        toast.error("Vehicle name is required");
        setLoading(false);
        return;
      }

      if (!formData.price_per_hour || Number(formData.price_per_hour) <= 0) {
        toast.error("Price per hour is required and must be greater than 0");
        setLoading(false);
        return;
      }

      if (formData.location.length === 0) {
        toast.error("At least one location must be selected");
        setLoading(false);
        return;
      }

      // Force directly set values to ensure they're correct
      const pricePerHour = Number(formData.price_per_hour);
      
      // Debug log to verify price value
      console.log('Price per hour value:', pricePerHour);
      
      // Create the vehicle data object with explicit property assignments
      const vehicleData = {
        name: formData.name,
        type: "bike", // Always set this value directly
        location: formData.location,
        pricePerHour: pricePerHour, // Explicitly set with no calculations
        minBookingHours: Number(formData.min_booking_hours || 1),
        quantity: Number(formData.quantity || 1),
        images: formData.images || [],
        // Add delivery-related fields with correct field names for the API
        is_delivery_enabled: formData.is_delivery_enabled,
        price_7_days: formData.price_7_days ? Number(formData.price_7_days) : null,
        price_15_days: formData.price_15_days ? Number(formData.price_15_days) : null,
        price_30_days: formData.price_30_days ? Number(formData.price_30_days) : null,
        delivery_price_7_days: formData.is_delivery_enabled && formData.delivery_price_7_days 
          ? Number(formData.delivery_price_7_days) 
          : null,
        delivery_price_15_days: formData.is_delivery_enabled && formData.delivery_price_15_days 
          ? Number(formData.delivery_price_15_days) 
          : null,
        delivery_price_30_days: formData.is_delivery_enabled && formData.delivery_price_30_days 
          ? Number(formData.delivery_price_30_days) 
          : null
      };

      // Log the exact data being sent including stringified version
      console.log('Sending vehicle data:', vehicleData);
      console.log('Stringified data:', JSON.stringify(vehicleData, null, 2));

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      // If there's an error, capture the full response
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error response:', errorBody);
        
        let parsedError;
        try {
          parsedError = JSON.parse(errorBody);
        } catch (e) {
          throw new Error(`Failed to create vehicle: ${errorBody}`);
        }
        
        throw new Error(parsedError.error || 'Failed to create vehicle');
      }

      const newVehicle = await response.json();
      onSuccess(newVehicle);
      resetForm(true);
      toast.success('Vehicle created successfully');
    } catch (error) {
      logger.error('Error creating vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (shouldClose: boolean = false) => {
    setFormData({
      name: '',
      type: 'bike',
      location: [] as AvailableLocation[],
      quantity: '1',
      price_per_hour: '50',
      min_booking_hours: '1',
      images: [],
      is_delivery_enabled: false,
      price_7_days: '',
      price_15_days: '',
      price_30_days: '',
      delivery_price_7_days: '',
      delivery_price_15_days: '',
      delivery_price_30_days: ''
    });
    setImageUrls([]);
    if (shouldClose) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Input
                value="Bike"
                disabled
                className="bg-gray-100"
              />
              <input 
                type="hidden" 
                name="type" 
                value="bike"
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location-madhapur"
                  checked={formData.location.includes('Madhapur')}
                  onCheckedChange={(checked) => {
                    handleLocationChange('Madhapur', checked as boolean);
                  }}
                  className="text-black border-gray-300 focus:ring-0"
                />
                <Label 
                  htmlFor="location-madhapur"
                  className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                >
                  Madhapur
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location-erragadda"
                  checked={formData.location.includes('Erragadda')}
                  onCheckedChange={(checked) => {
                    handleLocationChange('Erragadda', checked as boolean);
                  }}
                  className="text-black border-gray-300 focus:ring-0"
                />
                <Label 
                  htmlFor="location-erragadda"
                  className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                >
                  Erragadda
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Vehicle Images</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter image URL"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        handleAddImageUrl(input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500">or</span>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="flex-1"
                  />
                </div>
              </div>
              {formData.images.length > 0 && (
                <div className="col-span-2 grid grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt={`Vehicle preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          logger.warn('Image failed to load:', { url });
                          e.currentTarget.src = '/images/placeholder-vehicle.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index)
                          }));
                          setImageUrls(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Price Per Hour (₹)</Label>
              <Input
                id="price_per_hour"
                name="price_per_hour"
                type="number"
                min="0"
                value={formData.price_per_hour}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_delivery_enabled"
              checked={formData.is_delivery_enabled}
              onCheckedChange={(checked) => {
                setFormData(prev => ({
                  ...prev,
                  is_delivery_enabled: checked as boolean
                }));
              }}
            />
            <Label 
              htmlFor="is_delivery_enabled"
              className="text-sm font-medium cursor-pointer"
            >
              Enable for Delivery Partners
            </Label>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Regular User Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>7 Days Price</Label>
                <Input
                  type="number"
                  name="price_7_days"
                  value={formData.price_7_days}
                  onChange={handleInputChange}
                  placeholder="Enter 7 days price"
                />
              </div>
              <div className="space-y-2">
                <Label>15 Days Price</Label>
                <Input
                  type="number"
                  name="price_15_days"
                  value={formData.price_15_days}
                  onChange={handleInputChange}
                  placeholder="Enter 15 days price"
                />
              </div>
              <div className="space-y-2">
                <Label>30 Days Price</Label>
                <Input
                  type="number"
                  name="price_30_days"
                  value={formData.price_30_days}
                  onChange={handleInputChange}
                  placeholder="Enter 30 days price"
                />
              </div>
            </div>
          </div>

          {formData.is_delivery_enabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Partner Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>7 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_7_days"
                    value={formData.delivery_price_7_days}
                    onChange={handleInputChange}
                    placeholder="Enter 7 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>15 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_15_days"
                    value={formData.delivery_price_15_days}
                    onChange={handleInputChange}
                    placeholder="Enter 15 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>30 Days Price (Delivery)</Label>
                  <Input
                    type="number"
                    name="delivery_price_30_days"
                    value={formData.delivery_price_30_days}
                    onChange={handleInputChange}
                    placeholder="Enter 30 days price"
                    required={formData.is_delivery_enabled}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => resetForm(true)} disabled={loading}>
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