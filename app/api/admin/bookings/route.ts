import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { formatDateTimeIST } from '@/lib/utils/timezone';

interface BookingRow {
  id: string;
  booking_id: string | null;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  formatted_start_date?: string;
  formatted_end_date?: string;
  total_hours: number | null;
  total_price: number | null;
  status: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
  vehicle_location: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  vehicle_name: string | null;
}

const ITEMS_PER_PAGE = 10;

// Helper function to format date
function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return 'Invalid Date';
  try {
    return formatDateTimeIST(dateStr);
  } catch (error) {
    logger.error('Error formatting date in admin bookings:', { date: dateStr, error });
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
      WITH booking_data AS (
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
          b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
          b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at,
          b.booking_id,
          v.name as vehicle_name,
          v.location as vehicle_location,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          
          -- Explicitly format dates as strings in SQL for consistency
          TO_CHAR(b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') as formatted_start_date,
          TO_CHAR(b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') as formatted_end_date
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        LEFT JOIN users u ON b.user_id = u.id
      )
      SELECT * FROM booking_data
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    logger.info('Executing paginated SQL query with explicit IST conversion');
    const result = await query(sqlQuery, [ITEMS_PER_PAGE, offset]);

    // Transform the result
    const bookings = result.rows.map((row: Record<string, any>): BookingRow => ({
      id: row.id,
      booking_id: row.booking_id,
      user_id: row.user_id,
      vehicle_id: row.vehicle_id,
      start_date: row.start_date,
      end_date: row.end_date,
      formatted_start_date: row.formatted_start_date,
      formatted_end_date: row.formatted_end_date,
      total_hours: row.total_hours,
      total_price: row.total_price,
      status: row.status,
      payment_status: row.payment_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vehicle_location: row.vehicle_location,
      user_name: row.user_name,
      user_email: row.user_email,
      user_phone: row.user_phone,
      vehicle_name: row.vehicle_name
    }));

    // Format the data for the response
    const formattedBookings = bookings.map(booking => {
      // Use standardized date formatting for consistency across environments
      const formattedPickupDate = formatDateTimeIST(booking.start_date);
      const formattedDropoffDate = formatDateTimeIST(booking.end_date);
      
      return {
        id: booking.id,
        booking_id: booking.booking_id || `OR${booking.id.slice(0, 3)}`,
        user_id: booking.user_id,
        vehicle_id: booking.vehicle_id,
        pickup_datetime: booking.start_date,
        dropoff_datetime: booking.end_date,
        formatted_pickup: booking.formatted_start_date || formattedPickupDate,
        formatted_dropoff: booking.formatted_end_date || formattedDropoffDate,
        total_hours: Number(booking.total_hours || 0),
        total_price: Number(booking.total_price || 0),
        status: booking.status,
        payment_status: booking.payment_status || 'pending',
        created_at: booking.created_at,
        updated_at: booking.updated_at,
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
    });

    logger.info('Successfully transformed bookings:', { 
      count: formattedBookings.length,
      page,
      totalPages 
    });

    return NextResponse.json({ 
      success: true,
      data: {
        bookings: formattedBookings,
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

    // Get booking details before updating
    const bookingResult = await query(`
      SELECT 
        b.*,
        u.email as user_email,
        u.name as user_name,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Booking not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const booking = bookingResult.rows[0];

    // Update booking status
    const result = await query(`
      UPDATE bookings
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, bookingId]);

    // Send email notification
    try {
      const emailService = EmailService.getInstance();
      const whatsappService = WhatsAppService.getInstance();

      // Send email
      await emailService.sendEmail(
        booking.user_email,
        'Booking Cancellation - OnnRides',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f26e24;">Booking Cancelled</h1>
          <p>Dear ${booking.user_name},</p>
          <p>Your booking has been cancelled by the administrator.</p>
          
          <h2>Booking Details:</h2>
          <ul>
            <li>Booking ID: ${booking.id}</li>
            <li>Vehicle: ${booking.vehicle_name}</li>
            <li>Start Date: ${formatDate(booking.start_date)}</li>
            <li>End Date: ${formatDate(booking.end_date)}</li>
          </ul>
          
          <p>If you have any questions, please contact our support team:</p>
          <ul>
            <li>Email: support@onnrides.com</li>
            <li>Phone: +91 8247494622</li>
          </ul>
        </div>
        `,
        booking.id.toString()
      );

      // Send WhatsApp notification
      if (booking.user_phone) {
        await whatsappService.sendBookingCancellation(
          booking.user_phone,
          booking.user_name,
          booking.vehicle_name,
          booking.booking_id || booking.id.toString()
        );
      }

      logger.info('Cancellation notifications sent successfully', {
        bookingId: booking.id,
        userEmail: booking.user_email,
        userPhone: booking.user_phone
      });
    } catch (error) {
      logger.error('Failed to send cancellation notifications:', error);
      // Don't throw error here, we still want to return the cancelled booking
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error in PUT /api/admin/bookings:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to update booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 