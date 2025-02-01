'use client';

import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { Session } from 'next-auth';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalBookings: number;
  totalVehicles: number;
  bookingGrowth: number;
  revenueGrowth: number;
  recentBookings: Array<{
    id: string;
    amount: number;
    status: string;
    startDate: string;
    endDate: string;
    user: {
      name: string;
      email: string;
    };
    vehicle: {
      name: string;
    };
  }>;
}

const defaultStats: DashboardStats = {
  totalUsers: 0,
  totalRevenue: 0,
  totalBookings: 0,
  totalVehicles: 0,
  bookingGrowth: 0,
  revenueGrowth: 0,
  recentBookings: []
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/admin/dashboard', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch dashboard data');
      }
      
      // Validate the response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response data');
      }

      // Type guard to ensure all required properties exist
      const isValidDashboardData = (data: any): data is DashboardStats => {
        return (
          typeof data.totalUsers === 'number' &&
          typeof data.totalRevenue === 'number' &&
          typeof data.totalBookings === 'number' &&
          typeof data.totalVehicles === 'number' &&
          typeof data.bookingGrowth === 'number' &&
          typeof data.revenueGrowth === 'number' &&
          Array.isArray(data.recentBookings)
        );
      };

      if (!isValidDashboardData(data)) {
        throw new Error('Invalid dashboard data structure');
      }

      setStats(data);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch when component mounts
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user?.role === 'admin') {
      setLoading(true);
      fetchDashboardData();
    }
  }, [status, session, router]);

  // Set up auto-refresh every 30 seconds
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'admin') return;

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 md:p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Users</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats.totalUsers}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Revenue</h3>
          <p className="text-2xl md:text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
          <span className={`text-sm ${stats.revenueGrowth >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}% this month
          </span>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Bookings</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats.totalBookings}</p>
          <span className={`text-sm ${stats.bookingGrowth >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {stats.bookingGrowth >= 0 ? '+' : ''}{stats.bookingGrowth}% this month
          </span>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Vehicles</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats.totalVehicles}</p>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Bookings</h2>
        <div className="space-y-2">
          {Array.isArray(stats.recentBookings) && stats.recentBookings.length > 0 ? (
            stats.recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{booking.user?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{booking.user?.email || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{booking.vehicle?.name || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {booking.startDate && format(new Date(booking.startDate), 'MMM dd')} -{' '}
                    {booking.endDate && format(new Date(booking.endDate), 'MMM dd')}
                  </p>
                  <p className="text-sm font-medium">{formatCurrency(booking.amount || 0)}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      booking.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {booking.status || 'pending'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No recent bookings found
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 