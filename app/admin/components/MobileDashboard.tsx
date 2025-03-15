'use client';

import React from 'react';
import { FaUser, FaMoneyBillWave, FaCarSide, FaCalendarCheck, FaChartLine, FaSyncAlt } from 'react-icons/fa';
import StatCard from './StatCard';
import BookingItem from './BookingItem';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import PullToRefresh from './PullToRefresh';
import { MobileStatsGridSkeleton, MobileListItemSkeleton } from './MobileSpinner';

// Types for dashboard data
interface DashboardData {
  stats: {
    totalUsers: number;
    totalRevenue: number;
    revenueChange: string;
    totalBookings: number;
    bookingsChange: string;
    totalVehicles: number;
  };
  recentBookings: Array<{
    id: string;
    userName: string;
    userEmail: string;
    vehicleName: string;
    startDate: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    amount?: number;
  }>;
  isLoading: boolean;
}

export default function MobileDashboard() {
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalUsers: 0,
      totalRevenue: 0,
      revenueChange: '0%',
      totalBookings: 0,
      bookingsChange: '0%',
      totalVehicles: 0,
    },
    recentBookings: [],
    isLoading: true
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch data from the API
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
      
      // Transform API data to match our component's data structure
      setData({
        stats: {
          totalUsers: result.data.totalUsers || 0,
          totalRevenue: result.data.totalRevenue || 0,
          revenueChange: `${result.data.revenueGrowth > 0 ? '+' : ''}${result.data.revenueGrowth}%`,
          totalBookings: result.data.totalBookings || 0,
          bookingsChange: `${result.data.bookingGrowth > 0 ? '+' : ''}${result.data.bookingGrowth}%`,
          totalVehicles: result.data.totalVehicles || 0
        },
        recentBookings: Array.isArray(result.data.recentBookings) 
          ? result.data.recentBookings.map((booking: any) => ({
              id: String(booking.id || ''),
              userName: booking.user?.name || 'Unknown',
              userEmail: booking.user?.email || 'N/A',
              vehicleName: booking.vehicle?.name || 'Unknown Vehicle',
              startDate: new Date(booking.startDate).toLocaleDateString(),
              status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
              amount: Number(booking.amount || 0)
            }))
          : [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Set empty data with loading false
      setData(prev => ({
        ...prev,
        isLoading: false
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const handlePullRefresh = async () => {
    await fetchDashboardData();
  };

  // Handle manual refresh button
  const handleManualRefresh = () => {
    if (isRefreshing) return;
    fetchDashboardData();
  };

  const { stats, recentBookings, isLoading } = data;

  return (
    <PullToRefresh onRefresh={handlePullRefresh} disabled={isRefreshing}>
      <div className="pb-6">
        {/* Refresh button */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center text-xs font-medium text-gray-600 bg-white rounded-full px-3 py-1.5 shadow-sm"
          >
            <FaSyncAlt className={`mr-1.5 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {/* Stats Grid */}
        {isLoading ? (
          <div className="mb-6">
            <MobileStatsGridSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<FaUser size={16} />}
              className="col-span-1"
            />
            
            <StatCard
              title="Total Revenue"
              value={`₹${stats.totalRevenue}`}
              icon={<FaMoneyBillWave size={16} />}
              trend={{
                value: stats.revenueChange,
                direction: 'up',
                label: 'this month'
              }}
              variant="primary"
              className="col-span-1"
            />
            
            <StatCard
              title="Total Bookings"
              value={stats.totalBookings}
              icon={<FaCalendarCheck size={16} />}
              trend={{
                value: stats.bookingsChange,
                direction: 'up',
                label: 'this month'
              }}
              variant="secondary"
              className="col-span-1"
            />
            
            <StatCard
              title="Total Vehicles"
              value={stats.totalVehicles}
              icon={<FaCarSide size={16} />}
              className="col-span-1"
            />
          </div>
        )}
        
        {/* Activity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-xs font-medium text-orange-600">
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <MobileListItemSkeleton count={3} />
          ) : recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map(booking => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <BookingItem {...booking} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500">No recent bookings found</p>
            </div>
          )}
        </div>
        
        {/* Performance section */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <FaChartLine className="text-orange-600 mr-2" size={18} />
            <h2 className="text-lg font-bold text-gray-900">Performance</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between mb-1">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Revenue trend */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Revenue Trend</span>
                  <span className="text-xs font-medium text-green-600">+24%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
              
              {/* User growth */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">User Growth</span>
                  <span className="text-xs font-medium text-orange-600">+18%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>
              
              {/* Completion rate */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Booking Completion</span>
                  <span className="text-xs font-medium text-blue-600">89%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '89%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}

// Helper Link component to avoid next/link import issues
function Link({ href, className, children }: { href: string, className?: string, children: React.ReactNode }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
} 