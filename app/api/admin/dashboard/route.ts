import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

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
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get booking stats
    const bookingStats = await prisma.bookings.aggregate({
      _count: {
        id: true
      },
      where: {
        OR: [
          { status: 'active' },
          { status: 'completed' },
          { status: 'cancelled' }
        ]
      }
    });

    const activeBookings = await prisma.bookings.count({
      where: { status: 'active' }
    });

    const completedBookings = await prisma.bookings.count({
      where: { status: 'completed' }
    });

    const cancelledBookings = await prisma.bookings.count({
      where: { status: 'cancelled' }
    });

    // Get recent bookings
    const recentBookings = await prisma.bookings.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        vehicle: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    // Get revenue data
    const revenueData = await prisma.bookings.groupBy({
      by: ['created_at'],
      where: {
        status: 'completed'
      },
      _sum: {
        total_price: true
      },
      orderBy: {
        created_at: 'asc'
      },
      take: 30
    });

    const formattedRevenueData = revenueData.map(data => ({
      date: data.created_at,
      revenue: data._sum.total_price || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: bookingStats._count.id,
          active: activeBookings,
          completed: completedBookings,
          cancelled: cancelledBookings
        },
        recentBookings,
        revenueData: formattedRevenueData
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
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
