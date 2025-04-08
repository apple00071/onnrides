import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all active bookings that are either pending or in progress
    const trips = await prisma.bookings.findMany({
      where: {
        OR: [
          { status: 'CONFIRMED' },
          { status: 'IN_PROGRESS' }
        ]
      },
      include: {
        vehicles: true,
        users: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data for the frontend
    const transformedTrips = trips.map(trip => ({
      id: trip.id,
      booking_id: trip.id,
      vehicle_name: trip.vehicles?.name || 'Unknown Vehicle',
      customer_name: trip.users?.name || 'Unknown Customer',
      customer_phone: trip.users?.phone || 'N/A',
      start_time: trip.start_date.toISOString(),
      end_time: trip.end_date.toISOString(),
      pickup_location: trip.pickup_location || 'N/A',
      dropoff_location: trip.dropoff_location || 'N/A',
      amount: trip.total_price,
      status: trip.status.toLowerCase(),
    }));

    return NextResponse.json({
      success: true,
      trips: transformedTrips,
    });
  } catch (error) {
    console.error('[TRIPS_GET]', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return new NextResponse('Booking ID is required', { status: 400 });
    }

    // Start the trip by updating the booking status
    const updatedBooking = await prisma.bookings.update({
      where: {
        id: booking_id,
      },
      data: {
        status: 'IN_PROGRESS',
        start_date: new Date()
      },
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('[TRIPS_POST]', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return new NextResponse('Booking ID is required', { status: 400 });
    }

    // End the trip by updating the booking status
    const updatedBooking = await prisma.bookings.update({
      where: {
        id: booking_id,
      },
      data: {
        status: 'COMPLETED',
        end_date: new Date()
      },
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('[TRIPS_PUT]', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    );
  }
} 