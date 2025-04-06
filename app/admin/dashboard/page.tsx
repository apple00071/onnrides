'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import type { Session } from 'next-auth';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import logger from '@/lib/logger';
import dynamic from 'next/dynamic';
import useIsMobile from '../hooks/useIsMobile';

// Rename the conflicting dynamic export
export const dynamicConfig = 'force-dynamic';

// Import the MobileDashboard component with SSR disabled
const MobileDashboard = dynamic(() => import('../components/MobileDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  )
});

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalBookings: number;
  totalVehicles: number;
  bookingGrowth: number | null;
  revenueGrowth: number | null;
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

interface BookingData {
  id?: string | number;
  amount?: number | string;
  status?: string;
  startDate?: string;
  endDate?: string;
  user?: {
    name?: string;
    email?: string;
  };
  vehicle?: {
    name?: string;
  };
}

const defaultStats: DashboardStats = {
  totalUsers: 0,
  totalRevenue: 0,
  totalBookings: 0,
  totalVehicles: 0,
  bookingGrowth: null,
  revenueGrowth: null,
  recentBookings: []
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useIsMobile();

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      if (status === 'authenticated' && session?.user?.role !== 'admin') {
        router.push('/');
        return;
      }

      if (status === 'authenticated' && mounted) {
        await fetchDashboardData();
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }

      setStats({
        totalUsers: data.data.totalUsers || 0,
        totalRevenue: data.data.totalRevenue || 0,
        totalBookings: data.data.totalBookings || 0,
        totalVehicles: data.data.totalVehicles || 0,
        bookingGrowth: data.data.bookingGrowth,
        revenueGrowth: data.data.revenueGrowth,
        recentBookings: Array.isArray(data.data.recentBookings) 
          ? data.data.recentBookings.map((booking: any) => ({
              id: String(booking.id || ''),
              amount: Number(booking.amount || 0),
              status: String(booking.status || 'pending'),
              startDate: String(booking.startDate || ''),
              endDate: String(booking.endDate || ''),
              user: {
                name: String(booking.user?.name || 'Unknown'),
                email: String(booking.user?.email || 'N/A')
              },
              vehicle: {
                name: String(booking.vehicle?.name || 'Unknown')
              }
            }))
          : []
      });
    } catch (error) {
      logger.error('Dashboard fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (isMobile) {
    return <MobileDashboard />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Users</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </Card>
        
        <Card className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Revenue</h3>
          <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
          {stats.revenueGrowth !== null && stats.totalRevenue > 0 && (
            <p className="text-xs text-green-500">+{stats.revenueGrowth}% this month</p>
          )}
        </Card>
        
        <Card className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Bookings</h3>
          <p className="text-3xl font-bold">{stats.totalBookings}</p>
          {stats.bookingGrowth !== null && stats.totalBookings > 0 && (
            <p className="text-xs text-green-500">+{stats.bookingGrowth}% this month</p>
          )}
        </Card>
        
        <Card className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Vehicles</h3>
          <p className="text-3xl font-bold">{stats.totalVehicles}</p>
        </Card>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {stats.recentBookings.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentBookings.map((booking) => (
                    <tr key={`booking-${booking.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{booking.user.name}</div>
                        <div className="text-sm text-gray-500">{booking.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.vehicle.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(booking.startDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{booking.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent bookings found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 