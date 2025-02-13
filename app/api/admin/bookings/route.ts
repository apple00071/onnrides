import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 10;

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

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // Get total count first (in a separate query for better performance)
    const countResult = await query('SELECT COUNT(*) FROM bookings');
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Main query with pagination
    const sqlQuery = `
      SELECT 
        b.id,
        b.user_id,
        b.vehicle_id,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as start_date,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as end_date,
        b.total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        b.booking_id,
        v.name as vehicle_name,
        v.location as vehicle_location,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    logger.info('Executing paginated SQL query');
    const result = await query(sqlQuery, [ITEMS_PER_PAGE, offset]);

    // Transform the result
    const bookings = result.rows.map((booking) => ({
      id: booking.id,
      booking_id: booking.booking_id || `OR${booking.id.slice(0, 3)}`,
      user_id: booking.user_id,
      vehicle_id: booking.vehicle_id,
      pickup_datetime: booking.start_date,
      dropoff_datetime: booking.end_date,
      total_hours: Number(booking.total_hours || 0),
      total_price: Number(booking.total_price || 0),
      status: booking.status,
      payment_status: booking.payment_status || 'pending',
      created_at: booking.created_at,
      location: booking.vehicle_location || '',
      user: {
        name: booking.user_name || 'Unknown',
        email: booking.user_email || '',
        phone: booking.user_phone || 'N/A'
      },
      vehicle: {
        name: booking.vehicle_name || 'Unknown'
      }
    }));

    logger.info('Successfully transformed bookings:', { 
      count: bookings.length,
      page,
      totalPages 
    });

    return NextResponse.json({ 
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: ITEMS_PER_PAGE
        }
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/admin/bookings:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
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