import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface BookingWithRelations {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: Date;
  user: {
    name: string;
    email: string;
  };
  vehicle: {
    name: string;
    model: string;
    brand: string;
  };
}

interface RawBookingResult {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: Date;
  user_name: string;
  user_email: string;
  vehicle_name: string;
  vehicle_model: string;
  vehicle_brand: string;
}

interface DashboardData {
  totalRevenue: number;
  totalBookings: number;
  recentBookings: RawBookingResult[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Fetching dashboard data...');

    try {
      // Get total revenue
      const revenueResult = await prisma.$queryRaw<[{ total: string }]>`
        SELECT COALESCE(SUM(total_price), 0) as total FROM bookings
      `;
      const totalRevenue = parseFloat(revenueResult[0].total);
      logger.info('Revenue data fetched:', { totalRevenue });

      // Get total bookings count
      const totalBookings = await prisma.bookings.count();
      logger.info('Total bookings fetched:', { totalBookings });

      // Get recent bookings with related data using raw query
      const recentBookings = await prisma.$queryRaw<RawBookingResult[]>`
        SELECT 
          b.id,
          b.user_id,
          b.vehicle_id,
          b.start_date,
          b.end_date,
          b.total_hours,
          b.total_price,
          b.status,
          b.payment_status,
          b.created_at,
          u.name as user_name,
          u.email as user_email,
          v.name as vehicle_name,
          v.model as vehicle_model,
          v.brand as vehicle_brand
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        ORDER BY b.created_at DESC
        LIMIT 10
      `;
      logger.info('Recent bookings fetched:', { count: recentBookings.length });

      const data: DashboardData = {
        totalRevenue,
        totalBookings,
        recentBookings
      };

      logger.info('Dashboard data prepared successfully');
      
      return NextResponse.json(data);
    } catch (dbError) {
      logger.error('Database operation failed:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      throw new Error('Database operation failed');
    }
  } catch (error) {
    logger.error('Dashboard Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
} 
