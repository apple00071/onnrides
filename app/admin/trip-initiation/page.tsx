'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, PlayCircle, Filter, Search, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import InitiateBookingModal from './components/InitiateBookingModal';
import { TestModal } from './components/TestModal';
import ViewBookingModal from './components/ViewBookingModal';

// Define booking interface
interface BookingWithRelations {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'initiated' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'cancelled';
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  booking_type: 'online' | 'offline';
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  documents?: {
    dlFront?: string;
    dlBack?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    customerPhoto?: string;
    signature?: string;
  };
  missing_info?: string[];
}

// BookingsTable component
function BookingsTable({
  bookings,
  loading,
  onInitiate,
  onView
}: {
  bookings: BookingWithRelations[],
  loading: boolean,
  onInitiate: (booking: BookingWithRelations) => void,
  onView: (booking: BookingWithRelations) => void
}) {
  return (
    <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      <table className="w-full table-auto">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </td>
            </tr>
          ) : bookings.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                No bookings found
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.booking_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.vehicle?.name || (
                    <span className="text-gray-500">Vehicle not assigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div>
                    {booking.user?.name || (
                      <span className="text-gray-500">Customer not assigned</span>
                    )}
                  </div>
                  {booking.user?.phone && (
                    <div className="text-xs text-gray-500">{booking.user.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateTime(booking.start_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.booking_type === 'offline'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {booking.booking_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : booking.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'initiated'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(booking)}
                      className="border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-md"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant={booking.status === 'initiated' ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => onInitiate(booking)}
                      disabled={booking.status === 'cancelled'}
                      className={`focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-md ${booking.status === 'initiated'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                        : 'bg-orange-600 hover:bg-orange-700 text-white border-transparent'
                        }`}
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      {booking.status === 'initiated' ? 'Update' : 'Initiate'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TripInitiationPage() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch bookings on mount and when page, filters change
  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, typeFilter]);

  // Filter bookings when search query changes
  useEffect(() => {
    filterBookings();
  }, [searchQuery, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use the existing bookings API and filter
      // Later, a dedicated endpoint for trip initiation can be created
      const response = await fetch(`/api/admin/bookings?page=${currentPage}&status=${statusFilter !== 'all' ? statusFilter : ''}&type=${typeFilter !== 'all' ? typeFilter : ''}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch bookings');
      }

      // Map the data to match BookingWithRelations interface
      const mappedBookings = result.data.map((booking: any) => {
        // Get effective values from the API response
        const effectiveUserName = booking.effective_user_name || booking.user?.name;
        const effectiveUserPhone = booking.effective_user_phone || booking.user?.phone;
        const effectiveUserEmail = booking.effective_user_email || booking.user?.email;
        const effectiveVehicleName = booking.effective_vehicle_name || booking.vehicle?.name;

        return {
          id: booking.id,
          booking_id: booking.booking_id || '',
          user_id: booking.user_id,
          vehicle_id: booking.vehicle_id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_price: booking.total_price || 0,
          status: booking.status,
          payment_status: booking.payment_status || 'pending',
          payment_method: booking.payment_method,
          payment_reference: booking.payment_reference,
          notes: booking.notes,
          booking_type: booking.booking_type || 'online',
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          vehicle: {
            id: booking.vehicle_id,
            name: effectiveVehicleName || 'Vehicle not assigned',
            type: booking.vehicle_type
          },
          user: {
            id: booking.user_id,
            name: effectiveUserName || 'Customer not assigned',
            phone: effectiveUserPhone || '',
            email: effectiveUserEmail
          },
          documents: booking.documents || {},
          missing_info: identifyMissingInformation({
            ...booking,
            user_name: effectiveUserName,
            user_phone: effectiveUserPhone,
            documents: booking.documents || {}
          })
        };
      });

      setBookings(mappedBookings);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);

      filterBookings();
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
      setBookings([]);
      setFilteredBookings([]);
      setTotalPages(1);
      setTotalItems(0);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to identify missing information
  const identifyMissingInformation = (booking: any): string[] => {
    const missingInfo: string[] = [];

    // Check for essential customer information
    if (!booking.user_name) missingInfo.push('Customer Name');
    if (!booking.user_phone) missingInfo.push('Customer Phone');

    // For offline bookings, check for required documents
    if (booking.booking_type === 'offline') {
      const documents = booking.documents || {};
      if (!documents.dlFront) missingInfo.push('DL Front');
      if (!documents.dlBack) missingInfo.push('DL Back');
      if (!documents.aadhaarFront) missingInfo.push('Aadhaar Front');
      if (!documents.aadhaarBack) missingInfo.push('Aadhaar Back');
      if (!documents.customerPhoto) missingInfo.push('Customer Photo');
      if (!documents.signature) missingInfo.push('Signature');
    }

    return missingInfo;
  };

  const filterBookings = () => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bookings.filter(booking =>
      booking.booking_id.toLowerCase().includes(query) ||
      (booking.user?.name && booking.user.name.toLowerCase().includes(query)) ||
      (booking.user?.phone && booking.user.phone.toLowerCase().includes(query)) ||
      (booking.vehicle?.name && booking.vehicle.name.toLowerCase().includes(query))
    );

    setFilteredBookings(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleInitiateTrip = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setIsInitiateModalOpen(true);
  };

  const handleTripInitiated = async (bookingId: string) => {
    toast({
      title: "Success",
      description: "Trip successfully initiated"
    });

    setIsInitiateModalOpen(false);
    setSelectedBooking(null);
    await fetchBookings();
  };

  const handleRefresh = () => {
    fetchBookings();
  };

  const handleViewBooking = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(true);
  };

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchBookings} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="flex-1 flex flex-col w-full">
        {/* Desktop Summary Info (Hidden on Mobile) */}
        <div className="hidden md:block bg-white border-b px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-orange-500 pl-3">Manage Trip Initiations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and initiate trips for confirmed bookings
          </p>
        </div>

        <div className="flex-1 flex flex-col w-full">
          <div className="bg-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="initiated">Initiated</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex pb-0.5">
                <Button onClick={handleRefresh} variant="outline" className="w-full h-11 gap-2 border-gray-300 rounded-xl shadow-sm hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="px-4 flex-1 overflow-hidden">
            <Tabs defaultValue="pending" className="w-full h-full flex flex-col">
              <TabsList className="mb-4 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-md px-4 py-2">Pending</TabsTrigger>
                <TabsTrigger value="initiated" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-md px-4 py-2">Initiated</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-md px-4 py-2">All</TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="pending" className="mt-0 h-full">
                  <BookingsTable
                    bookings={filteredBookings.filter(b =>
                      (b.status === 'confirmed' && b.payment_status === 'completed') ||
                      (b.booking_type === 'offline' && b.status === 'confirmed')
                    )}
                    loading={loading}
                    onInitiate={handleInitiateTrip}
                    onView={handleViewBooking}
                  />
                </TabsContent>

                <TabsContent value="initiated" className="mt-0 h-full">
                  <BookingsTable
                    bookings={filteredBookings.filter(b => b.status === 'initiated')}
                    loading={loading}
                    onInitiate={handleInitiateTrip}
                    onView={handleViewBooking}
                  />
                </TabsContent>

                <TabsContent value="all" className="mt-0 h-full">
                  <BookingsTable
                    bookings={filteredBookings}
                    loading={loading}
                    onInitiate={handleInitiateTrip}
                    onView={handleViewBooking}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                Showing page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg h-9"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg h-9"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <>
          <InitiateBookingModal
            booking={selectedBooking}
            isOpen={isInitiateModalOpen}
            onClose={() => {
              setIsInitiateModalOpen(false);
              setSelectedBooking(null);
            }}
            onInitiated={handleTripInitiated}
          />
          <ViewBookingModal
            booking={selectedBooking}
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedBooking(null);
            }}
          />
        </>
      )}
    </div>
  );
}

