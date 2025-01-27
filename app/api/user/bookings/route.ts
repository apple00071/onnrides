import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

interface BookingBody {
  vehicle_id: string;
  start_date: string;
  end_date: string;
  duration: number;
  total_amount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userBookings = await query(`
      SELECT b.*, v.* 
      FROM bookings b 
      JOIN vehicles v ON b.vehicle_id = v.id 
      WHERE b.user_id = $1
    `, [session.user.id]);

    return new NextResponse(JSON.stringify(userBookings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch bookings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    logger.info('Received booking data:', body);
    
    const { vehicle_id, start_date, end_date, duration, total_amount } = body as BookingBody;

    // Validate required fields
    if (!vehicle_id || !start_date || !end_date || !duration || !total_amount) {
      const missingFields = {
        vehicle_id: !vehicle_id,
        start_date: !start_date,
        end_date: !end_date,
        duration: !duration,
        total_amount: !total_amount
      };
      
      logger.error('Missing required fields:', missingFields);
      return new NextResponse(JSON.stringify({ 
        error: 'Missing required fields',
        details: missingFields
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        id: randomUUID(),
        user_id: session.user.id,
        vehicle_id,
        pickup_datetime: new Date(start_date),
        dropoff_datetime: new Date(end_date),
        total_hours: duration,
        total_price: total_amount,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    logger.info('Created booking:', booking);
    return new NextResponse(JSON.stringify({ booking }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 