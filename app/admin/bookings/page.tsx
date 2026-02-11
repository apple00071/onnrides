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

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

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
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Booking Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage orders, payments, and schedules</p>
        </div>
        <div className="flex justify-between items-center w-full sm:w-auto gap-3">
          <div className="md:hidden text-sm font-medium text-gray-500">
            {bookings.length} Bookings
          </div>
          <Button
            className="bg-[#f26e24] hover:bg-[#d95e1d] text-white shadow-sm flex items-center gap-2 h-10 px-4 rounded-xl"
            onClick={() => router.push('/admin/offline-booking')}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Create Offline Booking</span>
            <span className="sm:hidden">Offline</span>
          </Button>
        </div>
      </div>

      <div className="bg-white p-3 md:p-6 rounded-xl border shadow-sm space-y-3 md:space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 md:h-11 border-gray-200 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium text-sm rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 md:h-10 border-gray-200 bg-gray-50/30 text-xs font-medium rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Payment</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9 md:h-10 border-gray-200 bg-gray-50/30 text-xs font-medium rounded-lg">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {paymentOptions.map((payment) => (
                  <SelectItem key={payment} value={payment} className="capitalize text-xs">
                    {payment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 md:col-span-1 flex gap-2 pt-1 md:pt-0">
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex-1 border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors h-9 md:h-10 text-[10px] font-bold uppercase tracking-wider rounded-lg"
              >
                <FilterX className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
            )}
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
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-widest uppercase">
                        {booking.booking_id}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-1.5 leading-none">{booking.user.name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${booking.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                        {booking.status}
                      </div>
                      <span className="text-xs font-black text-gray-900 tracking-tight">₹{booking.total_price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100/50">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-tight">Vehicle</span>
                      <div className="font-bold text-[11px] text-gray-700 truncate">{booking.vehicle.name}</div>
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{booking.registration_number || 'No Reg'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-tight">Payment</span>
                      <div className={`text-[11px] font-black uppercase ${booking.payment_status === 'completed' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                        {booking.payment_status}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{booking.booking_type}</span>
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