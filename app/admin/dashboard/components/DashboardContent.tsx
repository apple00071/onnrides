import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { FaUsers, FaRupeeSign, FaCalendarCheck, FaCar, FaPlus, FaUserCog, FaChartBar } from 'react-icons/fa';
import { StatsCard } from './StatsCard';
import { QuickActionCard } from './QuickActionCard';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface DashboardData {
  totalUsers: number;
  totalRevenue: number;
  totalBookings: number;
  totalVehicles: number;
  bookingGrowth: number | null;
  revenueGrowth: number | null;
  recentBookings: Array<{
    id: string;
    amount: string;
    status: string;
    start_date: string;
    end_date: string;
    user_name: string;
    user_email: string;
    vehicle_name: string;
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    entity_id: string;
  }>;
}

export default function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }

        setData(result.data);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          <p className="mt-2 text-sm text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={data.totalUsers.toLocaleString()}
          icon={<FaUsers className="h-6 w-6" />}
          change={data.bookingGrowth ? `${data.bookingGrowth.toFixed(1)}%` : 'N/A'}
          trend={data.bookingGrowth && data.bookingGrowth > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${data.totalRevenue.toLocaleString()}`}
          icon={<FaRupeeSign className="h-6 w-6" />}
          change={data.revenueGrowth ? `${data.revenueGrowth.toFixed(1)}%` : 'N/A'}
          trend={data.revenueGrowth && data.revenueGrowth > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Total Bookings"
          value={data.totalBookings.toLocaleString()}
          icon={<FaCalendarCheck className="h-6 w-6" />}
          change={data.bookingGrowth ? `${data.bookingGrowth.toFixed(1)}%` : 'N/A'}
          trend={data.bookingGrowth && data.bookingGrowth > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Active Vehicles"
          value={data.totalVehicles.toLocaleString()}
          icon={<FaCar className="h-6 w-6" />}
          change="N/A"
          trend="up"
        />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.user_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{booking.user_email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.vehicle_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{parseFloat(booking.amount || '0').toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(booking.start_date), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recentActivity.map((activity, index) => (
            <div key={`${activity.type}-${index}`} className="p-4 hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  activity.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'vehicle' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'booking' ? <FaCalendarCheck className="h-4 w-4" /> :
                   activity.type === 'vehicle' ? <FaCar className="h-4 w-4" /> :
                   <FaUsers className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          title="Add New Vehicle"
          description="List a new vehicle for rent"
          icon={<FaPlus className="h-6 w-6" />}
          onClick={() => {/* Add navigation logic */}}
        />
        <QuickActionCard
          title="Manage Users"
          description="View and manage user accounts"
          icon={<FaUserCog className="h-6 w-6" />}
          onClick={() => {/* Add navigation logic */}}
        />
        <QuickActionCard
          title="View Reports"
          description="Access detailed analytics"
          icon={<FaChartBar className="h-6 w-6" />}
          onClick={() => {/* Add navigation logic */}}
        />
      </div>
    </div>
  );
} 