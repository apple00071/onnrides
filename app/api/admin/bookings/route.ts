import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';

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
    
    // Log session for debugging
    logger.info('Session:', { session });

    if (!session?.user || session.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt:', { 
        userId: session?.user?.id,
        role: session?.user?.role 
      });
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use raw SQL with correct column names and timezone handling
    const sqlQuery = `
      SELECT 
        b.id,
        b.user_id,
        b.vehicle_id,
        b.start_date AT TIME ZONE 'UTC' as start_date,
        b.end_date AT TIME ZONE 'UTC' as end_date,
        EXTRACT(EPOCH FROM (b.end_date - b.start_date))/3600 as total_hours,
        b.total_price,
        b.status,
        b.created_at AT TIME ZONE 'UTC' as created_at,
        v.location as pickup_location,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id
      ORDER BY b.created_at DESC
    `;

    logger.info('Executing SQL query:', { sqlQuery });

    const result = await query(sqlQuery);

    logger.info('Query result:', { 
      rowCount: result.rows.length,
      firstRow: result.rows[0] 
    });

    // Transform the result with correct field mappings and timezone handling
    const bookings = result.rows.map((booking) => {
      try {
        return {
          id: booking.id,
          user_id: booking.user_id,
          vehicle_id: booking.vehicle_id,
          pickup_datetime: booking.start_date instanceof Date ? booking.start_date.toISOString() : booking.start_date,
          dropoff_datetime: booking.end_date instanceof Date ? booking.end_date.toISOString() : booking.end_date,
          total_hours: Number(booking.total_hours || 0),
          total_price: Number(booking.total_price || 0),
          status: booking.status,
          created_at: booking.created_at instanceof Date ? booking.created_at.toISOString() : booking.created_at,
          location: booking.pickup_location || '',
          user: {
            name: booking.user_name || 'Unknown',
            email: booking.user_email || '',
            phone: booking.user_phone || ''
          },
          vehicle: {
            name: booking.vehicle_name || 'Unknown'
          }
        };
      } catch (err) {
        logger.error('Error transforming booking:', { 
          error: err, 
          booking 
        });
        throw err;
      }
    });

    logger.info('Successfully transformed bookings:', { 
      count: bookings.length 
    });

    return new Response(JSON.stringify({ 
      success: true,
      bookings 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Log the full error details
    logger.error('Error fetching admin bookings:', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });

    return new Response(JSON.stringify({ 
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update booking
    const result = await query(`
      UPDATE bookings
      SET status = $1,
          updated_at = $2
      WHERE id = $3
      RETURNING id, status, updated_at
    `, [status, new Date(), bookingId]);

    const updatedBooking = result.rows[0];

    return new Response(JSON.stringify({ 
      success: true,
      booking: updatedBooking 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Failed to update booking' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 