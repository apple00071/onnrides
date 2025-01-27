import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { getDb } from '@/lib/db';
import type { Database, BookingStatus } from '@/lib/schema';

// Helper function to format date
function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return 'Invalid Date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

// Helper function to format amount
function formatAmount(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '₹0.00';
  return `₹${numericAmount.toFixed(2)}`;
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
    const status = url.searchParams.get('status') as BookingStatus | null;
    const userId = url.searchParams.get('userId');
    const isHistoryView = url.searchParams.get('history') === 'true';

    const db = getDb();

    // Build base query
    let query = db
      .selectFrom('bookings')
      .leftJoin('users', 'users.id', 'bookings.user_id')
      .leftJoin('vehicles', 'vehicles.id', 'bookings.vehicle_id')
      .selectAll('bookings')
      .select([
        'users.id as user_id',
        'users.name as user_name',
        'users.email as user_email',
        'users.phone as user_phone',
        'vehicles.name as vehicle_name',
        'vehicles.type as vehicle_type'
      ]);

    // Add filters
    if (status) {
      query = query.where('bookings.status', '=', status);
    }
    if (userId) {
      query = query.where('bookings.user_id', '=', userId);
      if (isHistoryView) {
        // For history view, get all bookings for the user
        query = query.orderBy('bookings.created_at', 'desc');
      }
    } else {
      // For main view, get only recent bookings
      query = query.orderBy('bookings.created_at', 'desc').limit(10);
    }

    // Execute query
    const result = await query.execute();

    // Transform the result
    const transformedBookings = result.map((booking) => ({
      id: booking.id,
      customer: {
        id: booking.user_id,
        name: booking.user_name || 'Unknown',
        email: booking.user_email || '',
        phone: booking.user_phone || ''
      },
      vehicle: {
        name: booking.vehicle_name || 'Unknown',
        type: booking.vehicle_type || 'car'
      },
      booking_date: formatDate(booking.created_at),
      duration: {
        from: formatDate(booking.start_date),
        to: formatDate(booking.end_date)
      },
      pickup_location: booking.pickup_location || '',
      dropoff_location: booking.dropoff_location || '',
      amount: formatAmount(booking.total_price),
      status: booking.status || 'pending',
      payment_status: booking.payment_status || 'Payment Not Confirmed'
    }));

    return new Response(JSON.stringify({ 
      bookings: transformedBookings,
      isHistoryView,
      userId
    }), {
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

    const db = getDb();

    // Update booking
    const [updatedBooking] = await db
      .updateTable('bookings')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', bookingId)
      .returning(['id', 'status', 'updated_at'])
      .execute();

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