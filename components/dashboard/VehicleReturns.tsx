import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/time-formatter";
import Link from "next/link";

interface VehicleReturn {
  id: string;
  booking_id: string;
  vehicle_name: string;
  user_name: string;
  return_date: string;
  status: string;
  is_overdue: boolean;
}

interface VehicleReturnsProps {
  data: VehicleReturn[];
}

export function VehicleReturns({ data }: VehicleReturnsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Returns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles to return</p>
          ) : (
            data.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.vehicle_name}</p>
                    <span className="text-xs text-muted-foreground">
                      ID: {item.booking_id}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Rented by: {item.user_name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Return Date: {formatDateTime(item.return_date)}
                    </p>
                    {item.is_overdue && (
                      <span className="text-xs font-medium text-red-600">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/admin/bookings?id=${item.booking_id}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 