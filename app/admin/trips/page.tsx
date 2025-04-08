'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { formatDateIST, formatTimeIST } from '@/lib/utils';
import { Loader2, MapPin, Calendar, Clock, IndianRupee } from 'lucide-react';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  booking_id: string;
  vehicle_name: string;
  customer_name: string;
  customer_phone: string;
  start_time: string;
  end_time: string;
  pickup_location: string;
  dropoff_location: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/trips');
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }

      const data = await response.json();
      setTrips(data.trips || []);
    } catch (err) {
      logger.error('Error fetching trips:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trips');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load trips"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleStartTrip = async (bookingId: string) => {
    try {
      const response = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start trip');
      }

      toast({
        title: "Success",
        description: "Trip started successfully"
      });
      
      // Refresh trips list
      fetchTrips();
    } catch (error) {
      logger.error('Error starting trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start trip"
      });
    }
  };

  const handleEndTrip = async (bookingId: string) => {
    try {
      const response = await fetch('/api/admin/trips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to end trip');
      }

      toast({
        title: "Success",
        description: "Trip ended successfully"
      });
      
      // Refresh trips list
      fetchTrips();
    } catch (error) {
      logger.error('Error ending trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to end trip"
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Trip Management</CardTitle>
            <CardDescription>Manage ongoing and upcoming trips</CardDescription>
          </CardHeader>
          <div className="p-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchTrips}>Try Again</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Trip Management</CardTitle>
          <CardDescription>Manage ongoing and upcoming trips</CardDescription>
        </CardHeader>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No trips found
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{trip.vehicle_name}</h3>
                      <span className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        {
                          "bg-yellow-100 text-yellow-800": trip.status === "pending",
                          "bg-green-100 text-green-800": trip.status === "in_progress",
                          "bg-blue-100 text-blue-800": trip.status === "completed",
                          "bg-red-100 text-red-800": trip.status === "cancelled",
                        }
                      )}>
                        {trip.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Pickup</p>
                          <p className="text-sm text-gray-500">{trip.pickup_location}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Drop-off</p>
                          <p className="text-sm text-gray-500">{trip.dropoff_location}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Date</p>
                          <p className="text-sm text-gray-500">
                            {formatDateIST(trip.start_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Time</p>
                          <p className="text-sm text-gray-500">
                            {formatTimeIST(trip.start_time)} - {formatTimeIST(trip.end_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <IndianRupee className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Amount</p>
                          <p className="text-sm text-gray-500">{formatCurrency(trip.amount)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium">Customer Details</p>
                        <p className="text-sm text-gray-500">{trip.customer_name}</p>
                        <p className="text-sm text-gray-500">{trip.customer_phone}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                      {trip.status === 'pending' && (
                        <Button
                          onClick={() => handleStartTrip(trip.booking_id)}
                          className="w-full"
                        >
                          Start Trip
                        </Button>
                      )}
                      {trip.status === 'in_progress' && (
                        <Button
                          onClick={() => handleEndTrip(trip.booking_id)}
                          className="w-full"
                        >
                          End Trip
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 