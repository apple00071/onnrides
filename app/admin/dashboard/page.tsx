import { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BookingStats } from "@/components/dashboard/BookingStats";
import { UserVehicleStats } from "@/components/dashboard/UserVehicleStats";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { prisma } from "@/lib/prisma";
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

async function getBookingStats(): Promise<BookingStatsData> {
  try {
    const [total, active, completed, cancelled] = await Promise.all([
      prisma.bookings.count(),
      prisma.bookings.count({
        where: { status: 'active' },
      }),
      prisma.bookings.count({
        where: { status: 'completed' },
      }),
      prisma.bookings.count({
        where: { status: 'cancelled' },
      }),
    ]);

    return {
      totalBookings: total,
      activeBookings: active,
      completedBookings: completed,
      cancelledBookings: cancelled,
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
    const [totalUsers, totalVehicles, availableVehicles] = await Promise.all([
      prisma.users.count(),
      prisma.vehicles.count(),
      prisma.vehicles.count({
        where: { is_available: true },
      }),
    ]);

    return {
      totalUsers,
      totalVehicles,
      availableVehicles,
    };
  } catch (error) {
    logger.error('Error fetching user/vehicle stats:', error);
    return {
      totalUsers: 0,
      totalVehicles: 0,
      availableVehicles: 0,
    };
  }
}

async function getRecentBookings() {
  try {
    return await prisma.bookings.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        vehicles: true,
        users: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching recent bookings:', error);
    return [];
  }
}

interface RevenueDataPoint {
  date: string;
  amount: number;
}

interface BookingGroup {
  start_date: Date;
  _sum: {
    total_price: number | null;
  };
}

async function getRevenueData(): Promise<RevenueDataPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookings = await prisma.bookings.groupBy({
      by: ['start_date'],
      where: {
        start_date: {
          gte: thirtyDaysAgo,
        },
        status: 'completed',
      },
      _sum: {
        total_price: true,
      },
    });

    return bookings.map((booking: BookingGroup) => ({
      date: booking.start_date.toISOString().split('T')[0],
      amount: booking._sum.total_price || 0,
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