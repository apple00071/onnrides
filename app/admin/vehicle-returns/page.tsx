'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { showToast } from "@/lib/utils/toast-helper";
import { formatDateTime } from '@/lib/utils/time-formatter';

interface Booking {
  id: string;
  booking_id: string;
  start_date: string;
  end_date: string;
  status: string;
  user_name: string;
  user_email: string;
  vehicle_name: string;
  vehicle_type: string;
  user?: {
    name: string;
    phone: string;
  };
  vehicle?: {
    name: string;
  };
}

interface VehicleReturn {
  id: string;
  return_date: string;
  vehicle_name: string;
  vehicle_type: string;
  user_name: string;
  user_email: string;
  status: string;
  additional_charges: number;
  processed_by_name: string;
  booking_id: string;
  created_at: string;
}

export default function VehicleReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<VehicleReturn[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState<'bookings' | 'returns'>('bookings');

  const { toast } = useToast();

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to fetch bookings');
    }
  };

  // Fetch vehicle returns with pagination
  const fetchReturns = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/vehicle-returns?page=${page}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin-login?callbackUrl=/admin/vehicle-returns');
          return;
        }
        throw new Error(data.error || 'Failed to fetch vehicle returns');
      }

      setReturns(data.data);
      setCurrentPage(data.pagination?.currentPage || 1);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Error fetching vehicle returns:', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to fetch vehicle returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchReturns(currentPage);
  }, [currentPage]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'confirmed':
        return 'info';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleProcessReturn = (bookingId: string) => {
    router.push(`/admin/vehicle-returns/new?bookingId=${bookingId}`);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Completion</CardTitle>
          <CardDescription>
            Manage and track completed bookings and vehicle returns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <Button
                variant={activeTab === 'bookings' ? 'default' : 'outline'}
                onClick={() => setActiveTab('bookings')}
              >
                Active Bookings
              </Button>
              <Button
                variant={activeTab === 'returns' ? 'default' : 'outline'}
                onClick={() => setActiveTab('returns')}
              >
                Completed Bookings
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <>
              {activeTab === 'bookings' && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.booking_id}</TableCell>
                          <TableCell>
                            {booking.vehicle?.name || 'Not assigned'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.user?.name || 'Not assigned'}</div>
                              <div className="text-sm text-muted-foreground">{booking.user?.phone || 'No phone'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(booking.start_date)}</TableCell>
                          <TableCell>{formatDateTime(booking.end_date)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.status !== 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProcessReturn(booking.booking_id)}
                              >
                                Complete Booking
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {bookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            No bookings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              {activeTab === 'returns' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Additional Charges</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell>{returnItem.booking_id}</TableCell>
                        <TableCell>
                          <div>
                            <div>{returnItem.vehicle_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {returnItem.vehicle_type}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{returnItem.user_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {returnItem.user_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(returnItem.created_at)}
                        </TableCell>
                        <TableCell>
                          {returnItem.additional_charges > 0 ? (
                            <div className="text-orange-600 font-medium">
                              ₹{returnItem.additional_charges}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No charges</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(returnItem.status)}>
                            {returnItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{returnItem.processed_by_name}</TableCell>
                      </TableRow>
                    ))}
                    {returns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No completed bookings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === 'returns' && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 