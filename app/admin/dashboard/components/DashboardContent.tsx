import { format } from 'date-fns';
import { FaUsers, FaRupeeSign, FaCalendarCheck, FaCar, FaPlus, FaUserCog, FaChartBar } from 'react-icons/fa';
import { StatsCard } from './StatsCard';
import { QuickActionCard } from './QuickActionCard';

interface Booking {
  id: string;
  user: string;
  email: string;
  vehicle: string;
  amount: number;
  status: string;
  date: string;
}

const recentBookings: Booking[] = [
  {
    id: 'BK001',
    user: 'John Doe',
    email: 'john@example.com',
    vehicle: 'Toyota Camry',
    amount: 5000,
    status: 'completed',
    date: '2024-03-15T10:00:00Z'
  },
  {
    id: 'BK002',
    user: 'Jane Smith',
    email: 'jane@example.com',
    vehicle: 'Honda Civic',
    amount: 4500,
    status: 'pending',
    date: '2024-03-14T15:30:00Z'
  },
  {
    id: 'BK003',
    user: 'Mike Johnson',
    email: 'mike@example.com',
    vehicle: 'Hyundai Elantra',
    amount: 3800,
    status: 'cancelled',
    date: '2024-03-13T09:15:00Z'
  }
];

export default function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value="1,234"
          icon={<FaUsers className="h-6 w-6" />}
          change="+12%"
          trend="up"
        />
        <StatsCard
          title="Total Revenue"
          value="₹2.1M"
          icon={<FaRupeeSign className="h-6 w-6" />}
          change="+8%"
          trend="up"
        />
        <StatsCard
          title="Total Bookings"
          value="856"
          icon={<FaCalendarCheck className="h-6 w-6" />}
          change="+15%"
          trend="up"
        />
        <StatsCard
          title="Active Vehicles"
          value="45"
          icon={<FaCar className="h-6 w-6" />}
          change="+5%"
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
              {recentBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.user}</div>
                    <div className="text-sm text-gray-500">{booking.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.vehicle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{booking.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(booking.date), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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