import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { bookings, vehicles, users } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq, desc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface UpdateBookingBody {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

interface AuthResult {
  user: User;
}

// GET /api/admin/bookings - List all bookings
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user details including role
    const userDetails = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!userDetails || userDetails.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const allBookings = await db
      .select({
        id: bookings.id,
        user_id: bookings.user_id,
        vehicle_id: bookings.vehicle_id,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        total_price: bookings.total_price,
        status: bookings.status,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at,
        updated_at: bookings.updated_at,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          type: vehicles.type,
          price_per_hour: vehicles.price_per_hour
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone
        }
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .innerJoin(users, eq(bookings.user_id, users.id))
      .orderBy(desc(bookings.created_at));

    return NextResponse.json({
      success: true,
      bookings: allBookings
    });
  } catch (error) {
    logger.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/bookings - Update booking status
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user details including role
    const userDetails = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!userDetails || userDetails.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json() as UpdateBookingBody & { id: string };
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      );
    }

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, status)) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      );
    }

    // Update booking
    await db
      .update(bookings)
      .set({
        status,
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(bookings.id, id));

    // Get updated booking with details
    const [updatedBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking
    });

  } catch (error) {
    logger.error('Failed to update booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// Helper function to validate booking status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    cancelled: [],
    completed: []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
} 