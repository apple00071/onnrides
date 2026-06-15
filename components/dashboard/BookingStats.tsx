import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, CheckCircle, XCircle } from "lucide-react";

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
    <div className="contents">
      {/* Total Card */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 cursor-pointer overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Total Bookings</CardTitle>
          <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors">
            <CalendarDays className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{data.totalBookings}</div>
        </CardContent>
      </Card>

      {/* Active Card */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 cursor-pointer overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold text-blue-500 uppercase tracking-widest">Active Rentals</CardTitle>
          <div className="p-2 rounded-xl bg-blue-50/50 text-blue-500 group-hover:bg-blue-50 transition-colors">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight leading-none">{data.activeBookings}</div>
        </CardContent>
      </Card>

      {/* Completed Card */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-green-300 cursor-pointer overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold text-green-500 uppercase tracking-widest">Completed</CardTitle>
          <div className="p-2 rounded-xl bg-green-50/50 text-green-500 group-hover:bg-green-50 transition-colors">
            <CheckCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl md:text-3xl font-extrabold text-green-600 tracking-tight leading-none">{data.completedBookings}</div>
        </CardContent>
      </Card>

      {/* Cancelled Card */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-red-300 cursor-pointer overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-widest">Cancelled</CardTitle>
          <div className="p-2 rounded-xl bg-red-50/50 text-red-500 group-hover:bg-red-50 transition-colors">
            <XCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl md:text-3xl font-extrabold text-red-600 tracking-tight leading-none">{data.cancelledBookings}</div>
        </CardContent>
      </Card>
    </div>
  );
} 
