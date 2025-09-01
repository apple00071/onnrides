'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { formatDateTime } from '@/lib/utils/time-formatter';

interface Ride {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  payment_status: string;
  vehicle: {
    name: string;
    type: string;
    location: string;
  };
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    const fetchRides = async () => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/user/bookings', {
          signal: abortControllerRef.current.signal
        });
        
        // Check if component is still mounted
        if (!isMountedRef.current) return;

        // Log response status and headers for debugging
        logger.info('API Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Check if response is empty
        const responseText = await response.text();
        if (!responseText) {
          logger.info('Empty response received from API');
          setRides([]);
          return;
        }

        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
          logger.info('API Response data:', data);
        } catch (parseError) {
          logger.error('Failed to parse JSON response:', {
            responseText,
            error: parseError
          });
          throw new Error('Invalid response format from server');
        }

        // Check if response is not ok
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        // Check if data exists and has the correct structure
        if (data && typeof data === 'object' && 'data' in data) {
          const ridesData = data.data;
          if (Array.isArray(ridesData)) {
            setRides(ridesData);
          } else {
            setRides([]);
          }
        } else {
          logger.info('No rides data in response, setting empty array');
          setRides([]);
        }

      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        logger.error('Error fetching rides:', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          user: user?.id
        });

        // Only show error toast for unexpected errors
        if (error instanceof Error && 
            !error.message.includes('No rides found') &&
            !error.message.includes('Failed to fetch') &&
            !error.message.includes('Unexpected end of JSON input')) {
          toast.error('Unable to load rides. Please try again later.');
        } else {
          // If it's an empty response or parsing error, just set empty rides
          setRides([]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    if (user) {
      fetchRides();
    } else {
      setLoading(false);
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]); // Only depend on user

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
              <h3 className="text-xl font-semibold mb-2">{ride.vehicle.name}</h3>
              <div className="text-gray-600">
                <p>Start: {formatDateTime(ride.start_date)}</p>
                <p>End: {formatDateTime(ride.end_date)}</p>
                <p className="mt-2">
                  Status: <span className="capitalize">{ride.status}</span>
                </p>
                <p className="mt-2">
                  Payment: <span className="capitalize">{ride.payment_status}</span>
                </p>
                <p className="mt-2">
                  Amount: ₹{ride.total_price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 