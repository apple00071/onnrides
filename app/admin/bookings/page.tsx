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

      <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ID, Customer, or Reg No..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-gray-200 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 border-gray-200 bg-gray-50/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Payment</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-10 border-gray-200 bg-gray-50/30">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                {paymentOptions.map((payment) => (
                  <SelectItem key={payment} value={payment} className="capitalize">
                    {payment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 h-10">
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex-1 border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors h-10"
              >
                <FilterX className="h-4 w-4 mr-2" /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div>
          {loading ? (
            <TableSkeleton rows={10} />
          ) : error ? (
            <div className="py-12 text-center text-red-500">
              <h3 className="text-lg font-medium">Error loading bookings</h3>
              <p className="mt-2 text-sm">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchBookings}
              >
                Try Again
              </Button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-700">No bookings found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                  ? "Try adjusting your filters to find what you're looking for."
                  : "New bookings will appear here once they are created."}
              </p>
              {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredBookings}
              searchKey="booking_id"
              showSearch={false} // Custom search bar used above
              onRowClick={(row: any) => router.push(`/admin/bookings/${row.booking_id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}