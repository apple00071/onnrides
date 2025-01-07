'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';

export default function MyRidesPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <h1 className="text-3xl font-bold mb-6">My Rides</h1>
      
      {rides.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">You haven't booked any rides yet.</p>
          <a href="/vehicles" className="text-[#FF5722] hover:text-[#F4511E] mt-4 inline-block">
            Browse Vehicles
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ride cards will be mapped here */}
        </div>
      )}
    </div>
  );
} 