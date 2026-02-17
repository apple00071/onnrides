import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, CheckCircle, XCircle, Car, Users } from "lucide-react";

interface BookingStatsData {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

interface BookingStatsProps {
  data: BookingStatsData;
}

export function BookingStats({ data }: BookingStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:contents">
      <Card className="rounded-xl border shadow-sm group hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-3 bg-gray-50/50 md:bg-transparent">
          <CardTitle className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest">Total</CardTitle>
          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-1 md:pt-2">
          <div className="text-xl md:text-2xl font-black text-gray-900 tabular-nums">{data.totalBookings}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-blue-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-3 bg-blue-50/50 md:bg-transparent">
          <CardTitle className="text-[10px] md:text-sm font-bold text-blue-600 uppercase tracking-widest">Active</CardTitle>
          <Clock className="h-3.5 w-3.5 text-blue-400" />
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-1 md:pt-2">
          <div className="text-xl md:text-2xl font-black text-blue-700 tabular-nums">{data.activeBookings}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-green-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-3 bg-green-50/50 md:bg-transparent">
          <CardTitle className="text-[10px] md:text-sm font-bold text-green-600 uppercase tracking-widest">Done</CardTitle>
          <CheckCircle className="h-3.5 w-3.5 text-green-400" />
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-1 md:pt-2">
          <div className="text-xl md:text-2xl font-black text-green-700 tabular-nums">{data.completedBookings}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-red-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-3 bg-red-50/50 md:bg-transparent">
          <CardTitle className="text-[10px] md:text-sm font-bold text-red-600 uppercase tracking-widest">Cancel</CardTitle>
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-1 md:pt-2">
          <div className="text-xl md:text-2xl font-black text-red-700 tabular-nums">{data.cancelledBookings}</div>
        </CardContent>
      </Card>
    </div>
  );
} 