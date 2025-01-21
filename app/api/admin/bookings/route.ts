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
    // Verify authentication and admin role
    const auth = await verifyAuth() as AuthResult | null;
    if (!auth || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'confirmed' | 'cancelled' | 'completed' | null;
    const userId = searchParams.get('userId');
    const vehicleId = searchParams.get('vehicleId');

    // Build where conditions
    const conditions = [];
    if (status) conditions.push(eq(bookings.status, status));
    if (userId) conditions.push(eq(bookings.user_id, userId));
    if (vehicleId) conditions.push(eq(bookings.vehicle_id, vehicleId));

    // Get bookings with filters
    const bookingsList = await db
      .select()
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.created_at));

    // Get vehicle and user details for each booking
    const bookingsWithDetails = await Promise.all(
      bookingsList.map(async (booking) => {
        const [vehicle, bookingUser] = await Promise.all([
          db.select().from(vehicles).where(eq(vehicles.id, booking.vehicle_id)).limit(1),
          db.select().from(users).where(eq(users.id, booking.user_id)).limit(1)
        ]);

        return {
          ...booking,
          vehicle: vehicle[0],
          user: bookingUser[0] ? {
            id: bookingUser[0].id,
            email: bookingUser[0].email
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      bookings: bookingsWithDetails
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
    // Verify authentication and admin role
    const auth = await verifyAuth() as AuthResult | null;
    if (!auth || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, id));

    // Get updated booking with details
    const [updatedBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    const [vehicle, bookingUser] = await Promise.all([
      db.select().from(vehicles).where(eq(vehicles.id, updatedBooking.vehicle_id)).limit(1),
      db.select().from(users).where(eq(users.id, updatedBooking.user_id)).limit(1)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle: vehicle[0],
        user: bookingUser[0] ? {
          id: bookingUser[0].id,
          email: bookingUser[0].email
        } : null
      }
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