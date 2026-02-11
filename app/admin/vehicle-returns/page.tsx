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

  const activeBookings = bookings.filter(b =>
    !['completed', 'cancelled', 'failed'].includes(b.status?.toLowerCase() || '')
  );

  return (
    <div className="space-y-6">
      <div className="hidden md:block bg-white p-5 rounded-xl border shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Booking Completion</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage and track completed bookings and returns</p>
      </div>
      <div className="md:hidden text-sm font-medium text-gray-400 mb-2 px-1">
        Admin / Returns
      </div>
      <Card className="border-none shadow-none sm:border sm:shadow-sm mt-0">
        <CardContent className="pt-6 sm:pt-4">
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
                <div className="rounded-xl overflow-hidden">
                  <div className="hidden md:block border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-bold text-gray-900">Booking ID</TableHead>
                          <TableHead className="font-bold text-gray-900">Vehicle</TableHead>
                          <TableHead className="font-bold text-gray-900">Customer</TableHead>
                          <TableHead className="font-bold text-gray-900 text-center">Dates</TableHead>
                          <TableHead className="font-bold text-gray-900">Status</TableHead>
                          <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeBookings.map((booking) => (
                          <TableRow key={booking.booking_id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium">{booking.booking_id}</TableCell>
                            <TableCell className="text-gray-600">
                              {booking.vehicle?.name || 'Not assigned'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{booking.user?.name || 'Not assigned'}</div>
                                <div className="text-xs text-gray-500 font-medium">{booking.user?.phone || 'No phone'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="text-xs font-medium text-gray-600">{formatDateTime(booking.start_date)}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">to</div>
                              <div className="text-xs font-medium text-gray-600">{formatDateTime(booking.end_date)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(booking.status)} className="font-bold uppercase text-[10px] px-2 py-0.5">
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {booking.status !== 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleProcessReturn(booking.booking_id)}
                                  className="h-8 text-xs font-bold border-gray-200 hover:border-orange-200 hover:text-orange-600 transition-all rounded-lg"
                                >
                                  Complete Booking
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {activeBookings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500 font-medium">
                              No active bookings found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    {activeBookings.map((booking) => (
                      <div key={booking.booking_id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Booking ID</span>
                            <p className="text-sm font-bold text-gray-900 leading-none mt-0.5">{booking.booking_id}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(booking.status)} className="font-bold uppercase text-[9px] px-1.5 py-0">
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Vehicle</span>
                            <p className="text-sm text-gray-800 font-medium leading-tight">{booking.vehicle?.name || 'Not assigned'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Customer</span>
                              <p className="text-sm text-gray-800 font-medium leading-tight">{booking.user?.name || 'Not assigned'}</p>
                              {booking.user?.phone && (
                                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{booking.user.phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">End Date</span>
                              <p className="text-xs text-gray-800 font-bold leading-tight">{formatDateTime(booking.end_date)}</p>
                            </div>
                          </div>
                        </div>

                        {booking.status !== 'completed' && (
                          <Button
                            onClick={() => handleProcessReturn(booking.booking_id)}
                            className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition-all"
                          >
                            Complete Booking
                          </Button>
                        )}
                      </div>
                    ))}
                    {activeBookings.length === 0 && (
                      <div className="text-center py-12 text-gray-500 font-bold text-sm bg-gray-50/50 rounded-xl border border-dashed">
                        No active bookings found
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'returns' && (
                <div className="rounded-xl overflow-hidden">
                  <div className="hidden md:block border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-bold text-gray-900">Booking ID</TableHead>
                          <TableHead className="font-bold text-gray-900">Vehicle</TableHead>
                          <TableHead className="font-bold text-gray-900">Customer</TableHead>
                          <TableHead className="font-bold text-gray-900">Return Date</TableHead>
                          <TableHead className="font-bold text-gray-900">Charges</TableHead>
                          <TableHead className="font-bold text-gray-900">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returns.map((returnItem) => (
                          <TableRow key={returnItem.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium">{returnItem.booking_id}</TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-900">{returnItem.vehicle_name}</div>
                              <div className="text-xs text-gray-500 font-medium capitalize">{returnItem.vehicle_type}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-900">{returnItem.user_name}</div>
                              <div className="text-xs text-gray-500 font-medium">{returnItem.user_email}</div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-gray-600">
                              {formatDateTime(returnItem.created_at)}
                            </TableCell>
                            <TableCell>
                              {returnItem.additional_charges > 0 ? (
                                <Badge variant="warning" className="bg-orange-50 text-orange-600 border-orange-100 font-bold">
                                  ₹{returnItem.additional_charges}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(returnItem.status)} className="font-bold uppercase text-[10px]">
                                {returnItem.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {returns.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500 font-medium">
                              No completed bookings found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    {returns.map((returnItem) => (
                      <div key={returnItem.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Booking ID</span>
                            <p className="text-sm font-bold text-gray-900 leading-none mt-0.5">{returnItem.booking_id}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(returnItem.status)} className="font-bold uppercase text-[9px] px-1.5 py-0">
                            {returnItem.status}
                          </Badge>
                        </div>

                        <div className="space-y-3 mb-1">
                          <div className="flex justify-between gap-4">
                            <div className="flex-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Vehicle</span>
                              <p className="text-sm text-gray-800 font-bold leading-tight">{returnItem.vehicle_name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-tight">{returnItem.vehicle_type}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Charges</span>
                              {returnItem.additional_charges > 0 ? (
                                <p className="text-sm text-orange-600 font-bold leading-tight">₹{returnItem.additional_charges}</p>
                              ) : (
                                <p className="text-sm text-gray-400 font-medium leading-tight">None</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Customer</span>
                              <p className="text-sm text-gray-800 font-bold leading-tight">{returnItem.user_name}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Return Date</span>
                              <p className="text-[11px] text-gray-800 font-bold leading-tight">{formatDateTime(returnItem.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {returns.length === 0 && (
                      <div className="text-center py-12 text-gray-500 font-bold text-sm bg-gray-50/50 rounded-xl border border-dashed">
                        No completed bookings found
                      </div>
                    )}
                  </div>
                </div>
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