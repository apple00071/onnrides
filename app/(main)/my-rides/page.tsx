'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface Ride {
  id: string;
  vehicle_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await fetch('/api/user/rides');
        if (!response.ok) {
          throw new Error('Failed to fetch rides');
        }
        const data = await response.json();
        setRides(data.rides || []);
      } catch (error) {
        logger.error('Error fetching rides:', error);
        toast.error('Failed to load rides. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRides();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Please log in to view your rides.</p>
        </div>
      </div>
    );
  }

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
          {rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">{ride.vehicle_name}</h3>
              <div className="text-gray-600">
                <p>Start: {new Date(ride.start_time).toLocaleString()}</p>
                <p>End: {new Date(ride.end_time).toLocaleString()}</p>
                <p className="mt-2">
                  Status: <span className="capitalize">{ride.status}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 