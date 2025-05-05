import { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BookingStats } from "@/components/dashboard/BookingStats";
import { UserVehicleStats } from "@/components/dashboard/UserVehicleStats";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { query } from "@/lib/db";
import logger from "@/lib/logger";

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

interface UserVehicleStatsData {
  totalUsers: number;
  totalVehicles: number;
  availableVehicles: number;
}

interface DashboardData {
  bookingStats: BookingStatsData;
  userVehicleStats: UserVehicleStatsData;
  recentBookings: any[]; // Will be replaced with proper Booking type once available
  revenueData: RevenueDataPoint[];
}

interface RevenueDataPoint {
  date: string;
  amount: number;
}

async function getBookingStats(): Promise<BookingStatsData> {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as "totalBookings",
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as "activeBookings",
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as "completedBookings",
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as "cancelledBookings"
      FROM bookings
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

async function getUserVehicleStats(): Promise<UserVehicleStatsData> {
  try {
    const [usersResult, vehiclesResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE role = \'user\''),
      query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_available = true THEN 1 END) as available FROM vehicles')
    ]);

    return {
      totalUsers: parseInt(usersResult.rows[0].count) || 0,
      totalVehicles: parseInt(vehiclesResult.rows[0].total) || 0,
      availableVehicles: parseInt(vehiclesResult.rows[0].available) || 0
    };
  } catch (error) {
    logger.error('Error fetching user/vehicle stats:', error);
    return {
      totalUsers: 0,
      totalVehicles: 0,
      availableVehicles: 0
    };
  }
}

async function getRecentBookings() {
  try {
    const result = await query(`
      SELECT 
        b.id::text as id,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type,
        b.status,
        b.start_date,
        b.end_date,
        b.total_price
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    return result.rows;
  } catch (error) {
    logger.error('Error fetching recent bookings:', error);
    return [];
  }
}

async function getRevenueData(): Promise<RevenueDataPoint[]> {
  try {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_price) as amount
      FROM bookings
      WHERE status = 'completed'
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return result.rows.map((row: { date: string; amount: string }) => ({
      date: row.date,
      amount: parseFloat(row.amount) || 0
    }));
  } catch (error) {
    logger.error('Error fetching revenue data:', error);
    return [];
  }
}

export default async function DashboardPage() {
  try {
    const [bookingStats, userVehicleStats, recentBookings, revenueData] = await Promise.allSettled([
      getBookingStats(),
      getUserVehicleStats(),
      getRecentBookings(),
      getRevenueData(),
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UserVehicleStats 
            data={userVehicleStats.status === 'fulfilled' ? userVehicleStats.value : {
              totalUsers: 0,
              totalVehicles: 0,
              availableVehicles: 0
            }}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <RevenueChart 
              data={revenueData.status === 'fulfilled' ? revenueData.value : []} 
            />
          </div>
          <div className="col-span-3">
            <RecentBookings 
              data={recentBookings.status === 'fulfilled' ? recentBookings.value : []} 
            />
          </div>
        </div>
      </DashboardShell>
    );
  } catch (error) {
    logger.error('Error rendering dashboard:', error);
    return <DashboardSkeleton />;
  }
} 