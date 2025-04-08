import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const bookingId = params.bookingId;
    if (!bookingId) {
      return new NextResponse('Booking ID is required', { status: 400 });
    }

    // Get the booking
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        vehicles: true,
      },
    });

    if (!booking) {
      return new NextResponse('Booking not found', { status: 404 });
    }

    // Check if the trip can be started
    if (booking.status !== 'CONFIRMED') {
      return new NextResponse('Booking must be confirmed to start trip', { status: 400 });
    }

    // Update booking status
    const updatedBooking = await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS',
      },
    });

    // Update vehicle status
    await prisma.vehicles.update({
      where: { id: booking.vehicle_id },
      data: {
        status: 'IN_USE',
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('[BOOKING_START_TRIP]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 