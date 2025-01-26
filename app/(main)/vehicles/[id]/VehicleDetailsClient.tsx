'use client';

import VehicleDetails from './VehicleDetails';
import { Vehicle } from './types';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Props = {
  params: {
    id: string;
  };
};

export default function VehicleDetailsClient({ params }: Props) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/vehicles/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle');
        }
        const vehicle = await response.json();
        setVehicle(vehicle);
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      }
    };

    fetchVehicle();
  }, [params.id]);

  const handleBookNow = async () => {
    console.log('Current user:', user);

    if (!user) {
      console.log('No user found, redirecting to login');
      toast.error('Please login to continue');
      await router.push('/login');
      return;
    }

    // Check if documents are verified from the profiles table
    try {
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profile = await response.json();

      console.log('Profile data:', profile);

      if (!profile?.is_documents_verified) {
        console.log('Documents not verified, redirecting to profile');
        toast.error('Please verify your documents first');
        await router.push('/profile');
        return;
      }

      // If user is logged in and documents are verified, proceed to booking
      const pickup = searchParams.get('pickup');
      const dropoff = searchParams.get('dropoff');
      const location = searchParams.get('location');

      console.log('All checks passed, proceeding to booking');
      const bookingUrl = `/booking?vehicleId=${params.id}&pickup=${pickup}&dropoff=${dropoff}&location=${location}`;
      console.log('Redirecting to:', bookingUrl);
      await router.push(bookingUrl);
    } catch (error) {
      console.error('Error checking user profile:', error);
      toast.error('Failed to verify user documents');
    }
  };

  if (!vehicle) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <VehicleDetails vehicle={vehicle} />
      <div className="max-w-xl mx-auto mt-8">
        <button 
          onClick={handleBookNow}
          className="w-full bg-[#FFB800] text-black py-2 rounded-lg hover:bg-[#F4A900] transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
} 