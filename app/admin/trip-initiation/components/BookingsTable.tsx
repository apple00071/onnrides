import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FolderOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Booking {
  id: string;
  vehicle_name: string;
  customer_name: string;
  start_date: string;
  type: 'online' | 'offline';
  status: 'confirmed' | 'initiated' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed';
}

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  onInitiate: (bookingId: string) => void;
}

export function BookingsTable({ bookings, loading, onInitiate }: BookingsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
        <p className="text-sm text-gray-500">There are no bookings matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Booking ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Vehicle
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.vehicle_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(booking.start_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge variant={booking.type === 'online' ? 'default' : 'secondary'}>
                      {booking.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge 
                      variant={
                        booking.status === 'confirmed' ? 'success' :
                        booking.status === 'initiated' ? 'warning' :
                        booking.status === 'completed' ? 'default' :
                        'destructive'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/admin/bookings/${booking.id}`, '_blank')}
                    >
                      View
                    </Button>
                    {booking.status === 'confirmed' && booking.payment_status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => onInitiate(booking.id)}
                      >
                        Initiate Trip
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 