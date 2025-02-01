import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

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

// Helper function to generate unique booking ID
function generateBookingId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'OR';
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
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
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // First, try to create the booking_id column if it doesn't exist
    try {
      await query(`
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id VARCHAR(5) UNIQUE;
      `);
      logger.info('Added booking_id column or it already exists');

      // Update existing bookings with generated booking IDs
      await query(`
        UPDATE bookings 
        SET booking_id = 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)
        WHERE booking_id IS NULL;
      `);
      logger.info('Updated existing bookings with booking IDs');
    } catch (err) {
      logger.error('Error setting up booking_id column:', err);
    }

    // Use raw SQL with correct column names and timezone handling
    const sqlQuery = `
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.location as vehicle_location,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as start_date,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as end_date,
        COALESCE(b.booking_id, 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)) as booking_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `;

    logger.info('Executing SQL query:', { sqlQuery });

    const result = await query(sqlQuery);

    // Log the first row for debugging
    if (result.rows.length > 0) {
      logger.info('First row data:', { 
        firstRow: JSON.stringify(result.rows[0], null, 2)
      });
    }

    // Transform the result with correct field mappings and timezone handling
    const bookings = result.rows.map((booking) => {
      try {
        return {
          id: booking.id,
          booking_id: booking.booking_id,
          user_id: booking.user_id,
          vehicle_id: booking.vehicle_id,
          pickup_datetime: booking.start_date instanceof Date ? booking.start_date.toISOString() : booking.start_date,
          dropoff_datetime: booking.end_date instanceof Date ? booking.end_date.toISOString() : booking.end_date,
          total_hours: Number(booking.total_hours || 0),
          total_price: Number(booking.total_price || 0),
          status: booking.status,
          payment_status: booking.payment_status || 'pending',
          created_at: booking.created_at instanceof Date ? booking.created_at.toISOString() : booking.created_at,
          location: booking.vehicle_location || '',
          user: {
            name: booking.user_name || 'Unknown',
            email: booking.user_email || '',
            phone: booking.user_phone || 'N/A'
          },
          vehicle: {
            name: booking.vehicle_name || 'Unknown'
          }
        };
      } catch (err) {
        logger.error('Error transforming booking:', { 
          error: err, 
          booking: JSON.stringify(booking, null, 2)
        });
        throw err;
      }
    });

    logger.info('Successfully transformed bookings:', { 
      count: bookings.length 
    });

    return NextResponse.json({ 
      success: true,
      bookings 
    });
  } catch (error) {
    // Log the full error details
    logger.error('Error fetching admin bookings:', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
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
    const { bookingId, action } = body;

    if (!bookingId || !action) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let status;
    switch (action) {
      case 'cancel':
        status = 'cancelled';
        break;
      default:
        return new Response(JSON.stringify({ 
          success: false,
          message: 'Invalid action' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Update booking status
    const result = await query(`
      UPDATE bookings
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, bookingId]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Booking not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedBooking = result.rows[0];
    logger.info('Booking updated:', { 
      bookingId, 
      action, 
      newStatus: status 
    });

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