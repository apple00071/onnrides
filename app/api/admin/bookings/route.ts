import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { bookings, users, vehicles } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: 'user' | 'admin';
}

interface BookingWithDetails {
  id: string;
  status: string;
  start_time: Date;
  end_time: Date;
  total_amount: number;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: 'user' | 'admin';
  };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    type: string;
    location: string;
    price_per_day: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const userId = url.searchParams.get('userId');

    // Get user if userId is provided
    let user: UserRow | undefined;
    if (userId) {
      const userResult = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId) as any)
        .limit(1);

      if (userResult.length > 0) {
        user = userResult[0] as UserRow;
      }
    }

    // Build query
    const result = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        start_time: bookings.start_time,
        end_time: bookings.end_time,
        total_amount: bookings.total_amount,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at,
        updated_at: bookings.updated_at,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
        vehicle: {
          id: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          type: vehicles.type,
          location: vehicles.location,
          price_per_day: vehicles.price_per_day,
        },
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id) as any)
      .innerJoin(users, eq(bookings.user_id, users.id) as any)
      .where(
        status && userId 
          ? and(eq(bookings.status, status) as any, eq(bookings.user_id, userId) as any) as any
          : status 
          ? eq(bookings.status, status) as any
          : userId
          ? eq(bookings.user_id, userId) as any
          : undefined
      )
      .orderBy(desc(bookings.created_at) as any) as unknown as BookingWithDetails[];

    return new Response(JSON.stringify({ bookings: result, user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching admin bookings:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch bookings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get booking
    const existingBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId) as any)
      .limit(1);

    if (!existingBooking.length) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update booking
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(bookings.id, bookingId) as any)
      .returning();

    return new Response(JSON.stringify(updatedBooking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 