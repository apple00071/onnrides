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
  // Add offline booking fields
  bookingType: string;
  customerName?: string;
  phoneNumber?: string;
  email?: string;
  alternatePhone?: string;
  aadharNumber?: string;
  fatherNumber?: string;
  motherNumber?: string;
  dateOfBirth?: string;
  dlNumber?: string;
  dlExpiryDate?: string;
  permanentAddress?: string;
  registrationNumber?: string;
  rentalAmount?: number;
  securityDepositAmount?: number;
  pendingAmount?: number;
  paymentMethod?: string;
  dlScan?: string;
  aadharScan?: string;
  selfie?: string;
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
              {booking.registrationNumber && (
                <p><span className="font-semibold">Registration Number:</span> {booking.registrationNumber}</p>
              )}
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
                <Badge variant={booking.status === 'active' ? 'success' : 'secondary'}>
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
              <p><span className="font-semibold">Booking ID:</span> {booking.displayId || booking.bookingId}</p>
              <p><span className="font-semibold">Booking Type:</span> {booking.bookingType}</p>
              {booking.paymentReference && (
                <p><span className="font-semibold">Payment Reference:</span> {booking.paymentReference}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-semibold">Name:</span> {booking.customerName}</p>
              <p><span className="font-semibold">Phone:</span> {booking.phoneNumber}</p>
              {booking.email && <p><span className="font-semibold">Email:</span> {booking.email}</p>}
              {booking.alternatePhone && (
                <p><span className="font-semibold">Alternate Phone:</span> {booking.alternatePhone}</p>
              )}
              {booking.aadharNumber && (
                <p><span className="font-semibold">Aadhar Number:</span> {booking.aadharNumber}</p>
              )}
              {booking.fatherNumber && (
                <p><span className="font-semibold">Father's Number:</span> {booking.fatherNumber}</p>
              )}
              {booking.motherNumber && (
                <p><span className="font-semibold">Mother's Number:</span> {booking.motherNumber}</p>
              )}
              {booking.dateOfBirth && (
                <p><span className="font-semibold">Date of Birth:</span> {formatDateIST(booking.dateOfBirth)}</p>
              )}
              {booking.dlNumber && (
                <p><span className="font-semibold">DL Number:</span> {booking.dlNumber}</p>
              )}
              {booking.dlExpiryDate && (
                <p><span className="font-semibold">DL Expiry Date:</span> {formatDateIST(booking.dlExpiryDate)}</p>
              )}
              {booking.permanentAddress && (
                <p><span className="font-semibold">Permanent Address:</span> {booking.permanentAddress}</p>
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
              {booking.rentalAmount && (
                <p><span className="font-semibold">Rental Amount:</span> ₹{booking.rentalAmount}</p>
              )}
              {booking.securityDepositAmount && (
                <p><span className="font-semibold">Security Deposit:</span> ₹{booking.securityDepositAmount}</p>
              )}
              <p><span className="font-semibold">Total Amount:</span> ₹{booking.totalPrice}</p>
              {booking.paidAmount && (
                <p><span className="font-semibold">Paid Amount:</span> ₹{booking.paidAmount}</p>
              )}
              {booking.pendingAmount && (
                <p><span className="font-semibold">Pending Amount:</span> ₹{booking.pendingAmount}</p>
              )}
              {booking.paymentMethod && (
                <p><span className="font-semibold">Payment Method:</span> {booking.paymentMethod}</p>
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

        {/* Documents */}
        {(booking.dlScan || booking.aadharScan || booking.selfie) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {booking.dlScan && (
                  <div>
                    <p className="font-semibold mb-2">DL Scan</p>
                    <img src={booking.dlScan} alt="DL Scan" className="w-full rounded-lg" />
                  </div>
                )}
                {booking.aadharScan && (
                  <div>
                    <p className="font-semibold mb-2">Aadhar Scan</p>
                    <img src={booking.aadharScan} alt="Aadhar Scan" className="w-full rounded-lg" />
                  </div>
                )}
                {booking.selfie && (
                  <div>
                    <p className="font-semibold mb-2">Selfie</p>
                    <img src={booking.selfie} alt="Selfie" className="w-full rounded-lg" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 