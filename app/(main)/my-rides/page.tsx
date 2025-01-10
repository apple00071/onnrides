'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'react-hot-toast';

export default function MyRidesPage() {
  const [rides] = useState([]);
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Rides</h1>

      {rides.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">You haven&apos;t taken any rides yet.</p>
          <p className="text-gray-600">
            Book your first ride and start your journey with us!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ride cards will go here */}
        </div>
      )}
    </div>
  );
} 