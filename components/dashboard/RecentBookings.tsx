import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/time-formatter";
import { Badge } from "@/components/ui/badge";

interface Booking {
  id: string;
  booking_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  pickup_location?: string;
  // Support both formats to ensure backward compatibility
  users?: {
    name: string | null;
    email: string | null;
  };
  vehicles?: {
    name: string;
    type: string;
  };
  status: string | null;
  start_date: string;
  end_date: string;
  total_price: number | null;
  booking_type?: string;
}

interface RecentBookingsProps {
  data: Booking[];
}

export function RecentBookings({ data }: RecentBookingsProps) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="p-3 md:p-4 pb-1.5 md:pb-2 border-b md:border-b-0">
        <CardTitle className="text-sm md:text-lg font-bold text-gray-900">Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <div className="space-y-3 md:space-y-4">
          {data.map((booking, index) => (
            <div key={`${booking.booking_id || booking.id}-${index}`} className="flex items-center">
              <div className="ml-0 space-y-1 w-full">
                <div className="flex justify-between items-center">
                  <p className="text-xs md:text-sm font-semibold leading-none text-gray-900">
                    {booking.user_name || 'Anonymous'}
                  </p>
                  <span className="text-[10px] text-gray-400 font-mono">
                    ID: {booking.booking_id || booking.id}
                  </span>
                </div>
                <p className="text-[11px] md:text-sm text-gray-500 font-medium">
                  {booking.vehicle_name || (booking.vehicles?.name) || 'Vehicle'}
                  <span className="text-[10px] text-gray-400 ml-1">({booking.vehicle_type || (booking.vehicles?.type) || 'Type'})</span>
                  {booking.pickup_location && (
                    <span className="ml-2 text-xs text-gray-500">
                      📍 {booking.pickup_location}
                    </span>
                  )}
                </p>
                <div className="flex items-center pt-1 md:pt-2">
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] md:text-sm text-gray-400 font-medium">
                      {formatDateTime(booking.start_date)}
                    </span>
                    <Badge variant="outline" className={`${booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                      booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                        booking.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-yellow-50 text-yellow-700 border-yellow-100'
                      } px-1.5 py-0 rounded text-[9px] font-bold h-4 uppercase`}>
                      {booking.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 