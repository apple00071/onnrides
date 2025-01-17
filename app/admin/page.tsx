'use client';

import { useState, useEffect } from 'react';
import { FaCar, FaUsers, FaBookmark, FaRupeeSign } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import logger from '../../lib/logger';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalVehicles: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/admin/login');
    },
  });
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch stats');
        }
        
        // Ensure all values are numbers
        setStats({
          totalVehicles: Number(data.totalVehicles) || 0,
          totalUsers: Number(data.totalUsers) || 0,
          totalBookings: Number(data.totalBookings) || 0,
          totalRevenue: Number(data.totalRevenue) || 0,
        });
        setError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch stats';
        logger.error('Error fetching stats:', error);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  const statCards = [
    {
      title: 'Total Vehicles',
      value: stats.totalVehicles,
      icon: FaCar,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: FaUsers,
      color: 'bg-green-500',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: FaBookmark,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: FaRupeeSign,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <p className="text-gray-600">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 