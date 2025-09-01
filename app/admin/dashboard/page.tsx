import { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BookingStats } from "@/components/dashboard/BookingStats";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { VehicleReturns } from "@/components/dashboard/VehicleReturns";
import { query } from "@/lib/db";
import logger from "@/lib/logger";
import { formatISO } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard for managing bookings and vehicles",
};

interface BookingStatsData {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

interface VehicleReturnData {
  id: string;
  vehicle_name: string;
  user_name: string;
  return_date: string;
  booking_id: string;
  status: string;
}

async function getBookingStats(): Promise<BookingStatsData> {
  try {
    const result = await query(`
      WITH booking_status AS (
        SELECT
          CASE 
            WHEN booking_type = 'offline' AND status = 'confirmed' THEN 'active'
            ELSE status
          END as calculated_status
        FROM bookings
      )
      SELECT
        COUNT(*) as "totalBookings",
        COUNT(CASE WHEN calculated_status = 'active' THEN 1 END) as "activeBookings",
        COUNT(CASE WHEN calculated_status = 'completed' THEN 1 END) as "completedBookings",
        COUNT(CASE WHEN calculated_status = 'cancelled' THEN 1 END) as "cancelledBookings"
      FROM booking_status
    `);

    return {
      totalBookings: parseInt(result.rows[0].totalBookings) || 0,
      activeBookings: parseInt(result.rows[0].activeBookings) || 0,
      completedBookings: parseInt(result.rows[0].completedBookings) || 0,
      cancelledBookings: parseInt(result.rows[0].cancelledBookings) || 0
    };
  } catch (error) {
    logger.error('Error fetching booking stats:', error);
    return {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0
    };
  }
}

interface BookingResult {
  id: string;
  booking_id: string;
  user_name: string;
  user_email: string;
  vehicle_name: string;
  vehicle_type: string;
  status: string;
  start_date: Date;
  end_date: Date;
  total_price: number;
  booking_type: string;
}

async function getRecentBookings() {
  try {
    const result = await query(`
      WITH booking_status AS (
      SELECT 
        b.id::text as id,
          b.booking_id,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type,
          CASE 
            WHEN b.booking_type = 'offline' AND b.status = 'confirmed' THEN 'active'
            ELSE b.status
          END as status,
        b.start_date,
        b.end_date,
          b.total_price,
          b.booking_type,
          b.created_at
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      )
      SELECT *
      FROM booking_status
      WHERE status IN ('active', 'confirmed', 'completed')
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return result.rows.map((booking: BookingResult) => ({
      ...booking,
      id: booking.booking_id, // Use booking_id instead of UUID
      start_date: formatISO(booking.start_date),
      end_date: formatISO(booking.end_date)
    }));
  } catch (error) {
    logger.error('Error fetching recent bookings:', error);
    return [];
  }
}

async function getVehicleReturns() {
  try {
    const result = await query(`
      WITH curr_time AS (
        SELECT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata' as now
      ),
      active_bookings AS (
        SELECT 
          b.id::text as id,
          b.booking_id,
          b.end_date at time zone 'Asia/Kolkata' as return_date,
          v.name as vehicle_name,
          u.name as user_name,
          CASE 
            WHEN b.booking_type = 'offline' AND b.status = 'confirmed' THEN 'active'
            ELSE b.status
          END as status,
          b.booking_type
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN users u ON b.user_id = u.id
        WHERE b.status NOT IN ('completed', 'cancelled')
      )
      SELECT 
        ab.*,
        CASE WHEN ab.return_date < ct.now THEN true ELSE false END as is_overdue
      FROM active_bookings ab
      CROSS JOIN curr_time ct
      WHERE ab.status IN ('active', 'confirmed')
      ORDER BY 
        CASE WHEN ab.return_date < ct.now THEN 0 ELSE 1 END,
        ab.return_date ASC
      LIMIT 10
    `);

    return result.rows.map((row: { 
      id: string;
      booking_id: string;
      return_date: Date; 
      vehicle_name: string; 
      user_name: string; 
      status: string;
      booking_type: string;
      is_overdue: boolean;
    }) => ({
      ...row,
      booking_id: row.booking_id,
      return_date: formatISO(row.return_date)
    }));
  } catch (error) {
    logger.error('Error fetching vehicle returns:', error);
    return [];
  }
}

export default async function DashboardPage() {
  try {
    const [bookingStats, vehicleReturns, recentBookings] = await Promise.allSettled([
      getBookingStats(),
      getVehicleReturns(),
      getRecentBookings(),
    ]);

    return (
      <DashboardShell>
        <DashboardHeader
          heading="Dashboard"
          text="Overview of your rental business"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BookingStats 
            data={bookingStats.status === 'fulfilled' ? bookingStats.value : { 
              totalBookings: 0, 
              activeBookings: 0, 
              completedBookings: 0, 
              cancelledBookings: 0 
            }} 
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <VehicleReturns 
            data={vehicleReturns.status === 'fulfilled' ? vehicleReturns.value : []} 
            />
            <RecentBookings 
              data={recentBookings.status === 'fulfilled' ? recentBookings.value : []} 
            />
        </div>
      </DashboardShell>
    );
  } catch (error) {
    logger.error('Error rendering dashboard:', error);
    return <DashboardSkeleton />;
  }
} 