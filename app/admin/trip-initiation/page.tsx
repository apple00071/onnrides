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
import InitiateBookingModal from './components/InitiateBookingModal';
import { TestModal } from './components/TestModal';

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
      const mappedBookings = result.data.map((booking: any) => ({
        id: booking.id,
        booking_id: booking.booking_id || '',
        user_id: booking.user_id,
        vehicle_id: booking.vehicle_id,
        start_date: booking.original_start_date,
        end_date: booking.original_end_date,
        total_price: booking.total_price || 0,
        status: booking.status,
        payment_status: booking.payment_status || 'pending',
        payment_method: booking.payment_method,
        payment_reference: booking.payment_reference,
        notes: booking.notes,
        booking_type: booking.booking_type || 'online',
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        vehicle: booking.vehicle_name ? {
          id: booking.vehicle_id,
          name: booking.vehicle_name
        } : undefined,
        user: booking.user_name ? {
          id: booking.user_id,
          name: booking.user_name,
          phone: booking.user_phone || '',
          email: booking.user_email
        } : undefined,
        documents: booking.documents || {},
        // We'll identify missing information based on booking type
        // For online bookings, we might need to check for ID verification
        // For offline bookings, we need to ensure all customer details are complete
        missing_info: identifyMissingInformation(booking)
      }));

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trip Initiation</h1>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
            <div>
              <CardTitle>Manage Trip Initiations</CardTitle>
              <CardDescription>
                Review and initiate trips for confirmed bookings
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-8 w-full sm:w-auto min-w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
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
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending Initiation</TabsTrigger>
              <TabsTrigger value="initiated">Initiated</TabsTrigger>
              <TabsTrigger value="all">All Bookings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-0">
              <BookingsTable 
                bookings={filteredBookings.filter(b => 
                  b.status === 'confirmed' && b.payment_status === 'completed'
                )}
                loading={loading}
                onInitiate={handleInitiateTrip}
              />
            </TabsContent>
            
            <TabsContent value="initiated" className="mt-0">
              <BookingsTable 
                bookings={filteredBookings.filter(b => b.status === 'initiated')}
                loading={loading}
                onInitiate={handleInitiateTrip}
              />
            </TabsContent>
            
            <TabsContent value="all" className="mt-0">
              <BookingsTable 
                bookings={filteredBookings}
                loading={loading}
                onInitiate={handleInitiateTrip}
              />
            </TabsContent>
          </Tabs>
          
          {/* Pagination */}
          {!loading && filteredBookings.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 mt-4">
              <div className="flex-1 flex justify-between items-center">
                <p className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages}
                </p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Initiate Booking Modal */}
      {selectedBooking && (
        <InitiateBookingModal
          booking={selectedBooking}
          isOpen={isInitiateModalOpen}
          onClose={() => {
            setIsInitiateModalOpen(false);
            setSelectedBooking(null);
          }}
          onInitiated={handleTripInitiated}
        />
      )}
    </div>
  );
}

// BookingsTable component
function BookingsTable({ 
  bookings, 
  loading, 
  onInitiate 
}: { 
  bookings: BookingWithRelations[],
  loading: boolean,
  onInitiate: (booking: BookingWithRelations) => void
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing Info</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </td>
            </tr>
          ) : bookings.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                No bookings found
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">
                  {booking.booking_id}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {booking.vehicle?.name || 'N/A'}
                </td>
                <td className="px-4 py-4 text-sm">
                  <div>{booking.user?.name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{booking.user?.phone || 'N/A'}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {formatDateTime(booking.start_date)}
                </td>
                <td className="px-4 py-4 text-sm">
                  <Badge variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}>
                    {booking.booking_type}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-sm">
                  <Badge
                    variant={
                      booking.status === 'cancelled'
                        ? 'destructive'
                        : booking.status === 'confirmed'
                        ? 'success'
                        : booking.status === 'initiated'
                        ? 'outline'
                        : 'warning'
                    }
                  >
                    {booking.status}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-sm">
                  {booking.missing_info && booking.missing_info.length > 0 ? (
                    <Badge variant="destructive">
                      {booking.missing_info.length} item{booking.missing_info.length > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="success">Complete</Badge>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant={booking.status === 'initiated' ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => onInitiate(booking)}
                      disabled={booking.status === 'cancelled'}
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