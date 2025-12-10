'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { VehicleDetailsProps } from './types';
import { useAuth } from '@/providers/AuthProvider';

export default function VehicleDetails({ vehicle }: VehicleDetailsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingDetails, setBookingDetails] = useState({
    pickupDate: '',
    dropoffDate: '',
    pickupTime: '',
    dropoffTime: ''
  });

  const handleBook = async () => {
    // First check if user is logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Then check document verification for logged in users
    // @ts-ignore - User type needs update in AuthProvider
    if (!user.isDocumentsVerified) {
      toast.error('Please verify your documents first');
      router.push('/profile');
      return;
    }

    // Get the booking details from URL params
    const pickup = searchParams?.get('pickup');
    const dropoff = searchParams?.get('dropoff');
    const location = searchParams?.get('location');

    if (!pickup || !dropoff || !location) {
      toast.error('Please select pickup and drop-off dates and times');
      return;
    }

    try {
      // If all checks pass, proceed to booking
      const bookingUrl = `/booking?vehicleId=${vehicle.id}&pickup=${pickup}&dropoff=${dropoff}&location=${location}`;
      router.push(bookingUrl);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative h-64 md:h-96">
          <Image
            src={vehicle.image_url}
            alt={vehicle.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
              <p className="text-base md:text-lg text-gray-600">{vehicle.description}</p>
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right">
              <p className="text-xl md:text-2xl font-bold text-[#f26e24]">₹{vehicle.price_per_day}/day</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Date
              </label>
              <input
                type="date"
                value={bookingDetails.pickupDate}
                onChange={(e) => setBookingDetails(prev => ({ ...prev, pickupDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
                onFocus={(e) => e.target.blur()}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Time
              </label>
              <input
                type="time"
                value={bookingDetails.pickupTime}
                onChange={(e) => setBookingDetails(prev => ({ ...prev, pickupTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
                onFocus={(e) => e.target.blur()}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drop-off Date
              </label>
              <input
                type="date"
                value={bookingDetails.dropoffDate}
                onChange={(e) => setBookingDetails(prev => ({ ...prev, dropoffDate: e.target.value }))}
                min={bookingDetails.pickupDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
                onFocus={(e) => e.target.blur()}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drop-off Time
              </label>
              <input
                type="time"
                value={bookingDetails.dropoffTime}
                onChange={(e) => setBookingDetails(prev => ({ ...prev, dropoffTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
                onFocus={(e) => e.target.blur()}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vehicle Features</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
              <li className="flex items-center space-x-2">
                <span className="text-[#f26e24]">✓</span>
                <span>{vehicle.transmission} Transmission</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#f26e24]">✓</span>
                <span>Fuel Type: {vehicle.fuel_type}</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#f26e24]">✓</span>
                <span>Mileage: {vehicle.mileage} kmpl</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#f26e24]">✓</span>
                <span>Seating Capacity: {vehicle.seating_capacity}</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleBook}
            className="w-full bg-[#FFB800] text-black py-2 rounded-lg hover:bg-[#F4A900] transition-colors"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
} 