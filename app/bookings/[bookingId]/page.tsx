'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { formatInTimeZone } from 'date-fns-tz';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/logger';

interface BookingDetails {
  id: string;
  bookingId: string;
  displayId: string;
  userId: string;
  vehicle: {
    id: string;
    name: string;
    type: string;
    pricePerDay: number;
    location: string;
  };
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentDetails?: any;
  paymentReference?: string;
  paidAmount?: number;
  pickupLocation: string;
  dropoffLocation: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to format date in IST
const formatDateIST = (dateString: string) => {
  return formatInTimeZone(new Date(dateString), 'Asia/Kolkata', 'PPP p');
};

// Helper function to parse location
const parseLocation = (location: string | string[]): string => {
  if (!location) return 'Location not available';
  if (Array.isArray(location)) return location[0];
  try {
    const parsed = typeof location === 'string' ? JSON.parse(location) : location;
    return Array.isArray(parsed) ? parsed[0] : location;
  } catch {
    return typeof location === 'string' ? location : 'Location not available';
  }
};

export default function BookingDetailsPage({ params }: { params: { bookingId: string } }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        if (sessionStatus === 'unauthenticated') {
          router.push('/auth/signin');
          return;
        }

        if (sessionStatus !== 'authenticated') {
          return;
        }

        const response = await fetch(`/api/bookings/${params.bookingId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch booking details');
        }

        setBooking(data.data);
      } catch (error) {
        logger.error('Error fetching booking details:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch booking details');
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();

    // Set up automatic refresh every 5 seconds if payment status is pending
    const refreshInterval = setInterval(() => {
      if (booking?.paymentStatus === 'pending') {
        fetchBookingDetails();
      }
    }, 5000);

    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [params.bookingId, sessionStatus, router, booking?.paymentStatus]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => router.push('/bookings')}>Back to Bookings</Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Booking not found</p>
        <Button onClick={() => router.push('/bookings')}>Back to Bookings</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Booking Details</h1>
        <Button onClick={() => router.push('/bookings')}>Back to Bookings</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-semibold">Vehicle:</span> {booking.vehicle.name}</p>
              <p><span className="font-semibold">Type:</span> {booking.vehicle.type}</p>
              <p><span className="font-semibold">Location:</span> {parseLocation(booking.vehicle.location)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Status:</span>{' '}
                <Badge variant={booking.status === 'confirmed' ? 'success' : 'secondary'}>
                  {booking.status}
                </Badge>
              </p>
              <p>
                <span className="font-semibold">Payment Status:</span>{' '}
                <Badge 
                  variant={
                    booking.paymentStatus === 'completed' 
                      ? 'success' 
                      : booking.paymentStatus === 'refunded'
                      ? 'secondary'
                      : 'warning'
                  }
                >
                  {booking.paymentStatus === 'pending' 
                    ? 'Payment Pending' 
                    : booking.paymentStatus === 'completed'
                    ? 'Paid'
                    : booking.paymentStatus}
                </Badge>
              </p>
              <p><span className="font-semibold">Booking ID:</span> {booking.displayId}</p>
              <p><span className="font-semibold">Reference ID:</span> {booking.bookingId}</p>
              {booking.paymentReference && (
                <p><span className="font-semibold">Payment Reference:</span> {booking.paymentReference}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Start Date:</span>{' '}
                {formatDateIST(booking.startDate)}
              </p>
              <p>
                <span className="font-semibold">End Date:</span>{' '}
                {formatDateIST(booking.endDate)}
              </p>
              <p>
                <span className="font-semibold">Pickup Location:</span>{' '}
                {parseLocation(booking.pickupLocation)}
              </p>
              <p>
                <span className="font-semibold">Dropoff Location:</span>{' '}
                {parseLocation(booking.dropoffLocation)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-semibold">Total Price:</span> {booking.totalPrice}</p>
              {booking.paidAmount && (
                <p><span className="font-semibold">Paid Amount:</span> {booking.paidAmount}</p>
              )}
              <p>
                <span className="font-semibold">Booked on:</span>{' '}
                {formatDateIST(booking.createdAt)}
              </p>
              <p>
                <span className="font-semibold">Last Updated:</span>{' '}
                {formatDateIST(booking.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 