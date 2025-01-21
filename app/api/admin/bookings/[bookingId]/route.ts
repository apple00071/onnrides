import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Booking, Vehicle } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/admin/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get vehicle details
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicle_id))
      .limit(1);

    return NextResponse.json({
      booking: {
        ...booking,
        vehicle
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/bookings/[bookingId] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus } = body;

    // Update booking
    const updatedBooking = await db
      .update(bookings)
      .set({
        ...(status && { status }),
        ...(paymentStatus && { payment_status: paymentStatus }),
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    if (!updatedBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get vehicle details
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, updatedBooking[0].vehicle_id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking[0],
        vehicle
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedBooking = await db
      .delete(bookings)
      .where(eq(bookings.id, params.bookingId))
      .returning();

    if (!deletedBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking: deletedBooking[0] });
  } catch (error) {
    logger.error('Error in DELETE /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 