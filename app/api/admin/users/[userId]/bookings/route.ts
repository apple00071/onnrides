import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { bookings, vehicles } from '@/lib/schema';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized access attempt to user bookings');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userBookings = await db
      .select({
        id: bookings.id,
        user_id: bookings.user_id,
        vehicle_id: bookings.vehicle_id,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        duration: bookings.duration,
        amount: bookings.amount,
        status: bookings.status,
        notes: bookings.notes,
        created_at: bookings.created_at,
        updated_at: bookings.updated_at,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          type: vehicles.type,
          location: vehicles.location,
          images: vehicles.images,
          price_per_hour: vehicles.price_per_hour,
        }
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, userId));

    logger.debug(`Successfully fetched ${userBookings.length} bookings for user ${userId}`);
    return NextResponse.json({
      bookings: userBookings.map(booking => ({
        ...booking,
        amount: Number(booking.amount),
        vehicle: booking.vehicle ? {
          ...booking.vehicle,
          location: booking.vehicle.location as unknown as string[],
          images: booking.vehicle.images as unknown as string[],
          price_per_hour: Number(booking.vehicle.price_per_hour),
        } : null,
      })),
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user bookings' },
      { status: 500 }
    );
  }
} 