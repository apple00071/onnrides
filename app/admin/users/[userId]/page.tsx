'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserCircle, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  is_blocked: boolean;
  documents?: {
    id: string;
    type: string;
    file_url: string;
    status: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
  }[];
  bookings?: {
    id: string;
    booking_id: string;
    vehicle: {
      name: string;
      type: string;
    };
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    payment_status: string;
    created_at: string;
  }[];
  trip_data?: {
    total_trips: number;
    completed_trips: number;
    cancelled_trips: number;
    total_spent: number;
    favorite_vehicle_type?: string;
  };
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Check auth status first
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
      toast.error('Please sign in with admin privileges to access this page');
      router.push('/auth/signin?callbackUrl=/admin/dashboard');
      return;
    }

    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/users/${params.userId}?include=bookings,tripData`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this user');
          }
          throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        if (isMounted) {
          setUser(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (params.userId) {
      fetchUserDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [params.userId, sessionStatus, session, router]);

  // Show loading state with better UI feedback
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  // Handle unauthorized access
  if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
    return null;
  }

  // Handle error state with better UI feedback
  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/admin/users')}
                className="w-full"
              >
                Return to Users List
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid gap-6">
          {/* User Details Card */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">User Details</h1>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={user.is_blocked ? "destructive" : "outline"}
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/admin/users/${user.id}/toggle-block`, {
                          method: 'POST'
                        });
                        if (!response.ok) throw new Error('Failed to update user status');
                        const updatedUser = await response.json();
                        setUser(updatedUser);
                        toast.success(user.is_blocked ? 'User unblocked successfully' : 'User blocked successfully');
                      } catch (err) {
                        toast.error('Failed to update user status');
                      }
                    }}
                  >
                    {user.is_blocked ? 'Unblock User' : 'Block User'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <UserCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Documents Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Documents</h2>
            {user.documents && user.documents.length > 0 ? (
              <div className="space-y-4">
                {user.documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium capitalize">{doc.type.replace('_', ' ')}</h3>
                        <p className="text-sm text-gray-500">
                          Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    {doc.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                    <div className="mt-2">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Document
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Document verification is not required for this user
              </div>
            )}
          </Card>

          {/* Trip Statistics Card */}
          {user.trip_data && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Trip Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Trips</p>
                  <p className="text-2xl font-semibold">{user.trip_data.total_trips}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Completed Trips</p>
                  <p className="text-2xl font-semibold text-green-600">{user.trip_data.completed_trips}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Cancelled Trips</p>
                  <p className="text-2xl font-semibold text-red-600">{user.trip_data.cancelled_trips}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-semibold">₹{user.trip_data.total_spent}</p>
                </div>
                {user.trip_data.favorite_vehicle_type && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2 md:col-span-4">
                    <p className="text-sm text-gray-500">Favorite Vehicle Type</p>
                    <p className="text-lg font-medium">{user.trip_data.favorite_vehicle_type}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Booking History Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Booking History</h2>
            {user.bookings && user.bookings.length > 0 ? (
              <div className="space-y-4">
                {user.bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{booking.vehicle.name}</h3>
                        <p className="text-sm text-gray-500">{booking.vehicle.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.payment_status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Start Date</p>
                        <p>{new Date(booking.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">End Date</p>
                        <p>{new Date(booking.end_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-medium">₹{booking.total_price}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Booking ID</p>
                        <p className="font-mono text-xs">{booking.booking_id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No booking history available
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 