import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/time-formatter";
import Link from "next/link";

interface VehicleReturn {
  id: string;
  booking_id: string;
  vehicle_name: string;
  vehicle_number: string;
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
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="p-3 md:p-4 pb-1.5 md:pb-2 border-b md:border-b-0">
        <CardTitle className="text-sm md:text-lg font-bold text-gray-900">Vehicle Returns</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <div className="space-y-2 md:space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles to return</p>
          ) : (
            data.map((item, index) => (
              <div key={`${item.booking_id}-${item.id}-${index}`} className="flex items-center justify-between border-b border-gray-50 pb-2 md:pb-3 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs md:text-sm font-semibold text-gray-900">
                      {item.vehicle_name}
                      <span className="text-[10px] text-gray-400 font-medium ml-1">
                        ({item.vehicle_number})
                      </span>
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ID: {item.id}
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500 font-medium">Renter: {item.user_name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] md:text-xs text-gray-500">
                      Return: {formatDateTime(item.return_date)}
                    </p>
                    {item.is_overdue && (
                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/bookings?id=${item.id}`}
                    className="text-[10px] md:text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View →
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