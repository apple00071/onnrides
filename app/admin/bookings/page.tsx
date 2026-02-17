'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { columns, type Booking } from './columns';
import { TableSkeleton } from '@/components/admin/LoadingSkeletons';
import { PlusCircle, Search, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { getBadgeColor } from '@/lib/constants/status-colors';
import { cn } from '@/lib/utils';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/bookings?t=' + Date.now(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Derived filtered bookings
  const filteredBookings = bookings.filter((booking: Booking) => {
    const matchesSearch =
      booking.booking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.registration_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || booking.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
  };

  const statusOptions = Array.from(new Set(bookings.map((b: Booking) => b.status)));
  const paymentOptions = Array.from(new Set(bookings.map((b: Booking) => b.payment_status)));

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="bg-white p-2 md:p-3 rounded-xl border shadow-sm">
        <div className="space-y-2 md:space-y-3">
          {/* Main Action Row - Always visible */}
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            {/* Search - Main focus */}
            <div className="flex-1 relative">
              <label className="hidden md:block text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ID, Name, Vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 md:h-11 rounded-lg md:rounded-xl border-gray-200 focus:ring-primary/20 transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Mobile Action Row: Toggle & Create */}
            <div className="flex md:contents gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex-1 md:hidden h-10 border-gray-200 text-xs font-bold uppercase tracking-wider rounded-lg",
                  showFilters && "bg-primary/5 border-primary/30 text-primary"
                )}
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                {showFilters ? 'Hide Filters' : 'Filters'}
              </Button>

              <Button
                className="flex-[2] md:w-auto bg-[#f26e24] hover:bg-[#d95e1d] text-white shadow-sm flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-bold text-xs"
                onClick={() => router.push('/admin/offline-booking')}
              >
                <PlusCircle className="h-4 w-4" />
                <span className="md:inline">Create <span className="hidden sm:inline">Offline</span> Booking</span>
                <span className="sm:hidden">Booking</span>
              </Button>
            </div>
          </div>

          {/* Collapsible/Desktop Filters Section */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-3 border-t border-gray-50 md:border-0 md:pt-0",
            !showFilters && "hidden md:grid"
          )}>
            {/* Status */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-gray-200 bg-gray-50/30 text-xs font-medium rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize text-xs">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Payment</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-10 border-gray-200 bg-gray-50/30 text-xs font-medium rounded-lg">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  {paymentOptions.map((payment) => (
                    <SelectItem key={payment} value={payment} className="capitalize text-xs">
                      {payment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            <div className="md:col-span-4">
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={!searchQuery && statusFilter === 'all' && paymentFilter === 'all'}
                className="w-full border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors h-10 text-[10px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-50 disabled:bg-gray-50"
              >
                <FilterX className="h-3.5 w-3.5 mr-1.5" /> Reset Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : error ? (
          <div className="py-12 text-center text-red-500 bg-red-50/30">
            <h3 className="text-sm font-bold uppercase tracking-tight">Error loading bookings</h3>
            <p className="mt-1 text-xs font-medium text-red-400">{error}</p>
            <Button
              variant="outline"
              className="mt-4 h-9 border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold"
              onClick={fetchBookings}
            >
              Try Again
            </Button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700 uppercase">No bookings found</h3>
            <p className="mt-1 text-xs text-gray-400 font-medium px-4">
              Try adjusting your filters or search terms.
            </p>
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
              <Button
                variant="outline"
                className="mt-4 h-9 border-gray-200 rounded-lg text-xs font-bold"
                onClick={resetFilters}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={filteredBookings}
                searchKey="booking_id"
                showSearch={false}
                onRowClick={(row: any) => router.push(`/admin/bookings/${row.booking_id}`)}
              />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 active:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/bookings/${booking.booking_id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[11px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-widest uppercase">
                        {booking.booking_id}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-2 leading-none">{booking.user.name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getBadgeColor(booking.status)} shadow-sm font-black text-[10px] uppercase tracking-tighter px-2 py-0.5`}>
                        {booking.status}
                      </Badge>
                      <span className="text-sm font-black text-gray-900 tracking-tight">₹{booking.total_price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100/50">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-tight mb-1">Vehicle</span>
                      <div className="font-bold text-[12px] text-gray-700 truncate">{booking.vehicle.name}</div>
                      <span className="text-[10px] font-mono tracking-wider text-primary bg-primary/5 px-1.5 py-0.5 rounded mt-1 w-fit uppercase border border-primary/10">
                        {booking.registration_number || 'No Reg No'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-tight mb-1 text-right w-full">Payment</span>
                      <Badge
                        variant="outline"
                        className={`${getBadgeColor(booking.payment_status)} font-black text-[10px] uppercase h-5`}
                      >
                        {booking.booking_type === 'online' && booking.payment_status === 'partially_paid'
                          ? '5% Online'
                          : booking.payment_status
                        }
                      </Badge>
                      <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">{booking.booking_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}