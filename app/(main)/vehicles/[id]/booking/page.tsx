'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProvider';

interface Vehicle {
  id: string;
  name: string;
  image_url: string;
  price_per_day: number;
  location: string;
  address: string;
  type: string;
}

export default function BookingSummaryPage({ params }: { params: { id: string } }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [helmets, setHelmets] = useState(1);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Format time to 12-hour format
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return '';
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Calculate rental charges
  const calculateCharges = () => {
    if (!vehicle) return { totalAmount: 0 };

    try {
      const pickup = new Date(searchParams.get('pickup') || '');
      const dropoff = new Date(searchParams.get('dropoff') || '');
      
      if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
        throw new Error('Invalid dates');
      }

      // Calculate total hours
      const diffInHours = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60));
      const totalAmount = diffInHours * 20; // ₹20/hr

      return { totalAmount };
    } catch (error) {
      console.error('Error calculating charges:', error);
      return { totalAmount: 0 };
    }
  };

  useEffect(() => {
    const checkUserAndFetchVehicle = async () => {
      // Redirect to login if user is not authenticated
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user's documents are verified
      try {
        const profileResponse = await fetch('/api/user/profile', {
          credentials: 'include'
        });
        if (!profileResponse.ok) throw new Error('Failed to fetch profile');
        const profileData = await profileResponse.json();

        if (!profileData.is_documents_verified) {
          toast.error('Please verify your documents before booking');
          router.push('/profile');
          return;
        }

        // Fetch vehicle details
        const vehicleResponse = await fetch(`/api/vehicles/${params.id}`, {
          credentials: 'include'
        });
        if (!vehicleResponse.ok) throw new Error('Failed to fetch vehicle');
        const vehicleData = await vehicleResponse.json();
        setVehicle(vehicleData);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchVehicle();
  }, [params.id, user, router]);

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (loading || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  const pickup = searchParams.get('pickup');
  const dropoff = searchParams.get('dropoff');
  const charges = calculateCharges();

  const handlePayment = () => {
    // Add payment logic here
    toast.success('Redirecting to payment gateway...');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Summary Section */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-6">SUMMARY</h1>
          
          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-lg font-medium">{formatTime(pickup)}</div>
                <div className="text-sm text-gray-600">{formatDate(pickup)}</div>
              </div>
              <div className="text-sm text-gray-400">to</div>
              <div className="text-right">
                <div className="text-lg font-medium">{formatTime(dropoff)}</div>
                <div className="text-sm text-gray-600">{formatDate(dropoff)}</div>
              </div>
            </div>

            <div className="flex gap-8 mb-6">
              <div className="w-48">
                <Image
                  src={vehicle.image_url}
                  alt={vehicle.name}
                  width={180}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{vehicle.name}</h2>
                <p className="text-gray-600 mb-1">{vehicle.location}</p>
                <p className="text-sm text-gray-500">{vehicle.address}</p>
              </div>
            </div>

            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>₹{charges.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Billing Details */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Billing Details</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h3 className="font-medium mb-4">Apply Coupon</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  className="flex-1 form-input rounded border-gray-200"
                />
                <button className="px-4 py-2 bg-white border border-gray-200 rounded font-medium">
                  APPLY
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span>Vehicle Rental Charges</span>
                <span>₹ {charges.totalAmount}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>₹ {charges.totalAmount}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Total Due</span>
                <span>₹ {charges.totalAmount}</span>
              </div>

              <button 
                onClick={handlePayment}
                className="w-full bg-[#FFB800] text-black font-medium py-3 rounded-lg hover:bg-[#F4A900] transition-colors"
              >
                Make payment
              </button>

              <p className="text-sm text-gray-500 mt-4">
                <span className="font-medium">Note:</span> An immediate cancellation can lead to a penalty of up to 100%. Carefully check & review your booking before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 