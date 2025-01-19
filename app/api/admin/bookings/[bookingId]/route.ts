import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
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
    const authResult = await verifyAuth();
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
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
      success: true,
      booking: {
        ...booking,
        vehicle
      }
    });

  } catch (error) {
    logger.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
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
    const authResult = await verifyAuth();
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
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

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus } = body;

    // Update booking
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        ...(status && { status }),
        ...(paymentStatus && { payment_status: paymentStatus }),
        updated_at: new Date()
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    // Get vehicle details
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicle_id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
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