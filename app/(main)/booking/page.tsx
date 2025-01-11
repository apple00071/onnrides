'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

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
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [pickupDateTime, _setPickupDateTime] = useState<string | null>(searchParams.get('pickup'));
  const [dropoffDateTime, _setDropoffDateTime] = useState<string | null>(searchParams.get('dropoff'));
  const [locationDetails, setLocationDetails] = useState({ main: '', sub: '' });

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/vehicles/${searchParams.get('vehicleId')}`);
        if (!response.ok) {
          throw new Error('Vehicle not found');
        }
        const data = await response.json();
        setVehicle(data);
        setLocationDetails({
          main: data.location,
          sub: data.address || ''
        });
      } catch (error) {
        toast.error('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };

    if (searchParams.get('vehicleId')) {
      fetchVehicle();
    }
  }, [searchParams]);

  const calculateTotalAmount = () => {
    if (!vehicle || !pickupDateTime || !dropoffDateTime) return 0;
    
    const start = new Date(pickupDateTime);
    const end = new Date(dropoffDateTime);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return vehicle.price_per_day * days;
  };

  const calculateTax = (amount: number) => {
    return amount * 0.18; // 18% GST
  };

  const handleMakePayment = async () => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicleId: vehicle?.id,
          pickupDateTime,
          dropoffDateTime,
          amount: totalAmount,
          couponCode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate payment');
      }

      const data = await response.json();
      window.location.href = data.paymentUrl;
    } catch (error) {
      toast.error('Failed to initiate payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">The vehicle you're looking for doesn't exist or has been removed.</p>
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
              <div className="relative w-full h-48">
                <Image
                  src={vehicle.image_url}
                  alt={vehicle.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
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
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>₹{baseAmount.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Details - Right Side */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">Billing Details</h2>

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
              <button className="bg-[#f26e24] text-white px-4 py-2 rounded hover:bg-[#e05d13] transition-colors">APPLY</button>
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
              <span className="text-[#f26e24]">₹ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleMakePayment}
            className="w-full bg-[#f26e24] text-white py-3 rounded-lg font-medium mt-6 hover:bg-[#e05d13] transition-colors"
          >
            Make payment
          </button>
        </div>
      </div>
    </div>
  );
} 