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
import { generateBookingId } from "@/lib/utils/booking-id";

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

interface OperationalMetrics {
  activeRentals: number;
  todayRevenue: number;
  overdueReturns: number;
  availableVehicles: number;
  todayPickups: number;
  todayReturns: number;
}

async function getBookingStats(): Promise<BookingStatsData> {
  try {
    const result = await query(`
      WITH booking_status AS (
        SELECT
          CASE 
            WHEN LOWER(booking_type) = 'offline' AND status ILIKE 'confirmed' THEN 'active'
            WHEN status ILIKE 'initiated' THEN 'active'
            WHEN status ILIKE 'active' THEN 'active'
            ELSE LOWER(status)
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

async function getOperationalMetrics(): Promise<OperationalMetrics> {
  try {
    // Get today's operational metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active rentals today (including offline mapping)
    const activeRentalsResult = await query(`
      SELECT COUNT(*) as active_rentals
      FROM bookings
      WHERE (
        status ILIKE 'active' 
        OR status ILIKE 'initiated'
        OR (LOWER(booking_type) = 'offline' AND status ILIKE 'confirmed')
      )
      AND start_date <= $2
      AND end_date >= $1
    `, [today, tomorrow]);

    const activeRentals = parseInt(activeRentalsResult.rows[0].active_rentals);

    // Today's revenue - Total of all completed payments today
    const todayRevenueResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as today_revenue
      FROM payments
      WHERE status = 'completed'
      AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = DATE($1 AT TIME ZONE 'Asia/Kolkata')
    `, [today]);

    const todayRevenue = parseFloat(todayRevenueResult.rows[0].today_revenue || 0);

    // Overdue returns
    const overdueReturnsResult = await query(`
      SELECT COUNT(*) as overdue_returns
      FROM bookings
      WHERE (
        status ILIKE 'active' 
        OR status ILIKE 'initiated'
        OR (LOWER(booking_type) = 'offline' AND status ILIKE 'confirmed')
      )
      AND end_date < $1
    `, [today]);

    const overdueReturns = parseInt(overdueReturnsResult.rows[0].overdue_returns);

    // Available vehicles
    const availableVehiclesResult = await query(`
      SELECT COUNT(*) as available_vehicles
      FROM vehicles
      WHERE status = 'active'
      AND is_available = true
    `);

    const availableVehicles = parseInt(availableVehiclesResult.rows[0].available_vehicles);

    // Today's pickups
    const todayPickupsResult = await query(`
      SELECT COUNT(*) as today_pickups
      FROM bookings
      WHERE DATE(start_date AT TIME ZONE 'Asia/Kolkata') = DATE($1 AT TIME ZONE 'Asia/Kolkata')
      AND (status ILIKE 'confirmed' OR status ILIKE 'active' OR status ILIKE 'initiated')
    `, [today]);

    const todayPickups = parseInt(todayPickupsResult.rows[0].today_pickups);

    // Today's returns
    const todayReturnsResult = await query(`
      SELECT COUNT(*) as today_returns
      FROM bookings
      WHERE DATE(end_date AT TIME ZONE 'Asia/Kolkata') = DATE($1 AT TIME ZONE 'Asia/Kolkata')
      AND (
        status ILIKE 'active' 
        OR status ILIKE 'initiated'
        OR (LOWER(booking_type) = 'offline' AND status ILIKE 'confirmed')
      )
    `, [today]);

    const todayReturns = parseInt(todayReturnsResult.rows[0].today_returns);


    return {
      activeRentals,
      todayRevenue,
      overdueReturns,
      availableVehicles,
      todayPickups,
      todayReturns
    };
  } catch (error) {
    logger.error('Error fetching operational metrics:', error);
    return {
      activeRentals: 0,
      todayRevenue: 0,
      overdueReturns: 0,
      availableVehicles: 0,
      todayPickups: 0,
      todayReturns: 0
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
  registration_number: string;
}

async function getRecentBookings() {
  try {
    const result = await query(`
      WITH booking_status AS (
      SELECT 
        b.id::text as id,
        b.booking_id,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.customer_name
          ELSE u.name
        END as user_name,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.email
          ELSE u.email
        END as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type,
        b.registration_number as vehicle_number,
        b.pickup_location,
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
      id: `OR${booking.booking_id.substring(0, 3).toUpperCase()}`,
      user_name: booking.user_name || 'Anonymous User',
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
          b.registration_number as vehicle_number,
          CASE 
            WHEN b.booking_type = 'offline' THEN b.customer_name
            ELSE u.name
          END as user_name,
          CASE 
            WHEN b.booking_type = 'offline' AND b.status = 'confirmed' THEN 'active'
            ELSE b.status
          END as status,
          b.booking_type
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE LOWER(b.status) NOT IN ('completed', 'cancelled', 'failed')
      )
      SELECT 
        ab.*,
        CASE WHEN ab.return_date < ct.now THEN true ELSE false END as is_overdue
      FROM active_bookings ab
      CROSS JOIN curr_time ct
      WHERE LOWER(ab.status) IN ('active', 'confirmed', 'initiated')
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
      vehicle_number: string;
      user_name: string;
      status: string;
      booking_type: string;
      is_overdue: boolean;
    }) => ({
      ...row,
      id: `OR${row.booking_id.substring(0, 3).toUpperCase()}`,
      user_name: row.user_name || 'Anonymous User',
      return_date: formatISO(row.return_date)
    }));
  } catch (error) {
    logger.error('Error fetching vehicle returns:', error);
    return [];
  }
}

export default async function DashboardPage() {
  try {
    const [bookingStats, vehicleReturns, recentBookings, operationalMetrics] = await Promise.allSettled([
      getBookingStats(),
      getVehicleReturns(),
      getRecentBookings(),
      getOperationalMetrics(),
    ]);

    const metrics = operationalMetrics.status === 'fulfilled' ? operationalMetrics.value : {
      activeRentals: 0,
      todayRevenue: 0,
      overdueReturns: 0,
      availableVehicles: 0,
      todayPickups: 0,
      todayReturns: 0
    };

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

        {/* Today's Operations Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Today's Operations</h3>
            <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeRentals}</div>
              <div className="text-sm text-gray-600">Active Rentals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{metrics.todayRevenue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Today's Revenue</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${metrics.overdueReturns > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.overdueReturns}
              </div>
              <div className="text-sm text-gray-600">Overdue Returns</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${metrics.availableVehicles < 3 ? 'text-orange-600' : 'text-green-600'}`}>
                {metrics.availableVehicles}
              </div>
              <div className="text-sm text-gray-600">Available Vehicles</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pickups Today:</span>
              <span className="font-medium">{metrics.todayPickups}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Returns Today:</span>
              <span className="font-medium">{metrics.todayReturns}</span>
            </div>
          </div>
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