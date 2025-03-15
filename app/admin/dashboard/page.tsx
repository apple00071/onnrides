'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
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
  ssr: false
});

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
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    icon?: string;
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
  bookingGrowth: 0,
  revenueGrowth: 0,
  recentBookings: [],
  recentActivity: []
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useIsMobile();

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') {
        router.push('/');
        return;
      }
      fetchDashboardData();
    }
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

      if (response.status === 401) {
        router.push('/auth/signin');
        return;
      }

      if (!response.ok) {
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
        bookingGrowth: data.data.bookingGrowth || 0,
        revenueGrowth: data.data.revenueGrowth || 0,
        recentActivity: Array.isArray(data.data.recentActivity) 
          ? data.data.recentActivity
          : [],
        recentBookings: Array.isArray(data.data.recentBookings) 
          ? data.data.recentBookings.map((booking: BookingData) => ({
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

  // Use the mobile dashboard component on mobile devices
  if (isMobile) {
    return <MobileDashboard />;
  }

  // Desktop dashboard layout with better space utilization
  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Stats Cards Row - Expand to fill available width */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Users</h3>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Revenue</h3>
              <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-500">+{stats.revenueGrowth}% this month</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Bookings</h3>
              <p className="text-3xl font-bold">{stats.totalBookings}</p>
              <p className="text-xs text-green-500">+{stats.bookingGrowth}% this month</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Vehicles</h3>
              <p className="text-3xl font-bold">{stats.totalVehicles}</p>
            </div>
          </div>
          
          {/* Two-column layout for remaining content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Bookings Column */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.recentBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
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
                </div>
              </div>
            </div>
            
            {/* Analytics and Activity Column */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Activity Summary</h2>
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border">
                  <div className="text-gray-400">Revenue chart visualization would appear here</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {stats.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex">
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full ${
                            activity.type === 'booking' ? 'bg-blue-100' :
                            activity.type === 'payment' ? 'bg-green-100' :
                            activity.type === 'vehicle' ? 'bg-orange-100' :
                            activity.type === 'user' ? 'bg-purple-100' :
                            'bg-gray-100'
                          } flex items-center justify-center`}>
                            <svg className={`h-5 w-5 ${
                              activity.type === 'booking' ? 'text-blue-600' :
                              activity.type === 'payment' ? 'text-green-600' :
                              activity.type === 'vehicle' ? 'text-orange-600' :
                              activity.type === 'user' ? 'text-purple-600' :
                              'text-gray-600'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                          <p className="text-sm text-gray-500">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 