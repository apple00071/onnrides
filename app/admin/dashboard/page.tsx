'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Session } from 'next-auth';

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalBookings: number;
  totalVehicles: number;
  recentBookings: Array<{
    id: string;
    user: {
      name: string;
      email: string;
    };
    vehicle: {
      name: string;
    };
    startDate: string;
    endDate: string;
    amount: number;
    status: string;
  }>;
}

const defaultStats: DashboardStats = {
  totalUsers: 0,
  totalRevenue: 0,
  totalBookings: 0,
  totalVehicles: 0,
  recentBookings: []
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }
    
    const userSession = session as Session | null;
    if (status === 'authenticated' && userSession?.user?.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats(defaultStats);
      } finally {
        setLoading(false);
      }
    };

    const userSession = session as Session | null;
    if (status === 'authenticated' && userSession?.user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [session, status]);

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Users</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats?.totalUsers || 0}</p>
          <span className="text-sm text-blue-500">+12% this month</span>
        </Card>
        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Revenue</h3>
          <p className="text-2xl md:text-3xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</p>
          <span className="text-sm text-green-500">+8% this month</span>
        </Card>
        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Bookings</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats?.totalBookings || 0}</p>
          <span className="text-sm text-purple-500">+15% this month</span>
        </Card>
        <Card className="p-4 md:p-6">
          <h3 className="text-sm text-gray-500">Total Vehicles</h3>
          <p className="text-2xl md:text-3xl font-bold">{stats?.totalVehicles || 0}</p>
          <span className="text-sm text-yellow-500">+5% this month</span>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-semibold">Recent Bookings</h2>
          <a href="/admin/bookings" className="text-blue-500 hover:underline text-sm md:text-base">
            View All
          </a>
        </div>
        <div className="space-y-2">
          {(stats?.recentBookings || []).map((booking) => (
            <Card key={booking.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{booking.user?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-500 truncate">{booking.user?.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{booking.vehicle?.name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm">
                    {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">₹{booking.amount || 0}</p>
                </div>
                <div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)) || 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {(!stats?.recentBookings || stats.recentBookings.length === 0) && (
            <Card className="p-4">
              <p className="text-center text-gray-500">No recent bookings</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 