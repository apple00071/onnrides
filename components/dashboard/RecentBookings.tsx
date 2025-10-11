import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/time-formatter";

interface Booking {
  id: string;
  booking_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  vehicle_name?: string;
  vehicle_type?: string;
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
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {data.map((booking) => (
            <div key={booking.id} className="flex items-center">
              <div className="ml-4 space-y-1 w-full">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium leading-none">
                    {booking.user_name || 'Anonymous User'}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ID: {booking.booking_id || booking.id}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {booking.vehicle_name || (booking.vehicles?.name) || 'Unknown Vehicle'} 
                  ({booking.vehicle_type || (booking.vehicles?.type) || 'Unknown Type'})
                </p>
                <div className="flex items-center pt-2">
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(booking.start_date)} - {formatDateTime(booking.end_date)}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status || 'pending'}
                    </span>
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