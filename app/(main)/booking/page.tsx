'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Vehicle {
  id: string;
  name: string;
  type: 'bike' | 'car';
  price_per_day: number;
  image_url: string;
  location: string;
  transmission?: string;
  fuel_type?: string;
  mileage?: string;
  seating_capacity?: number;
}

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [numHelmet, setNumHelmet] = useState(1);
  const [couponCode, setCouponCode] = useState('');

  const vehicleId = searchParams.get('vehicleId');
  const pickupDateTime = searchParams.get('pickup');
  const dropoffDateTime = searchParams.get('dropoff');
  const location = searchParams.get('location');

  const fetchVehicle = useCallback(async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle');
      }
      
      const vehicle = await response.json();
      if (!vehicle) {
        toast.error('Vehicle not found');
        router.push('/');
        return;
      }

      setVehicle(vehicle);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      toast.error('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, router]);

  useEffect(() => {
    if (!vehicleId || !pickupDateTime || !dropoffDateTime || !location) {
      toast.error('Missing required booking information');
      router.push('/');
      return;
    }

    fetchVehicle();
  }, [vehicleId, pickupDateTime, dropoffDateTime, location, router, fetchVehicle]);

  const calculateTotalAmount = () => {
    if (!vehicle) return 0;
    return vehicle.price_per_day;
  };

  const calculateTax = (amount: number) => {
    return amount * 0.28; // 28% GST
  };

  const handleMakePayment = () => {
    // TODO: Implement payment logic
    toast.success('Payment functionality coming soon!');
  };

  const getLocationAddress = (location: string) => {
    switch (location) {
    case 'Madhapur':
      return {
        main: '1173, Ayyappa Society Main Rd, Ayyappa Society, Mega Hills, Madhapur',
        sub: 'Ayyappa Society Main Rd, Madhapur, Hyderabad'
      };
    case 'Eragadda':
      return {
        main: 'Erragadda metro station R S hotel erragadda metro station',
        sub: 'Erragadda, Hyderabad'
      };
    default:
      return {
        main: location,
        sub: 'Hyderabad'
      };
    }
  };

  const locationDetails = getLocationAddress(location || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700">Vehicle not found</h2>
        <p className="text-gray-500 mt-2">The vehicle you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const baseAmount = calculateTotalAmount();
  const tax = calculateTax(baseAmount);
  const totalAmount = baseAmount + tax;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Summary Section - Left Side */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">SUMMARY</h1>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <img
                src={vehicle.image_url}
                alt={vehicle.name}
                className="w-full object-contain"
              />
              <h2 className="text-xl font-bold mt-4">{vehicle.name}</h2>
            </div>
            <div className="w-full md:w-2/3">
              <div className="flex justify-between text-lg mb-4">
                <div>
                  <div>{new Date(pickupDateTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-sm">{new Date(pickupDateTime!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="self-center">to</div>
                <div>
                  <div>{new Date(dropoffDateTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-sm">{new Date(dropoffDateTime!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700">{locationDetails.main}</p>
                <p className="text-gray-600">{locationDetails.sub}</p>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span>Peak duration pricing</span>
                  <span>₹{baseAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>₹{baseAmount.toFixed(1)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span>Number of Helmet (?)</span>
                  <select
                    value={numHelmet}
                    onChange={(e) => setNumHelmet(Number(e.target.value))}
                    className="border rounded px-2 py-1"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span>Km limit (?)</span>
                  <span>144 km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Excess km charges (?)</span>
                  <span>₹4.0/km</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Details - Right Side */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">Billing Details</h2>

          <div className="mb-6">
            <div className="flex items-center gap-2 p-4 border rounded-lg">
              <input type="checkbox" className="accent-[#f26e24]" />
              <div className="flex justify-between items-center w-full">
                <span>RB Wallet Balance</span>
                <span>(₹ 0.0)</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Apply Coupon</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="flex-1 p-2 border rounded"
              />
              <button className="bg-black text-white px-4 py-2 rounded">APPLY</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Vehicle Rental Charges</span>
              <span>₹ {baseAmount.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>₹ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Refundable Deposit</span>
              <span>₹ 0</span>
            </div>
            <div className="flex justify-between font-semibold pt-4 border-t">
              <span>Subtotal</span>
              <span>₹ {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl">
              <span>Total Due</span>
              <span>₹ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleMakePayment}
            className="w-full bg-[#ffc107] text-black py-3 rounded-lg font-medium mt-6 hover:bg-[#ffb300] transition-colors"
          >
            Make payment
          </button>
        </div>
      </div>
    </div>
  );
} 