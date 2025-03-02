import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import { 
  buildTimezoneAwareQuery, 
  toISTSql, 
  selectWithISTDates 
} from '@/lib/utils/sql-helpers';
import { withTimezoneProcessing } from '@/middleware/timezone-middleware';

// Set this route as dynamic to allow headers modification
export const dynamic = 'force-dynamic';

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

// Update the GET function to use our middleware
const getBookingsHandler = async (request: NextRequest) => {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters with defaults
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const status = url.searchParams.get('status') || 'all';
    const searchTerm = url.searchParams.get('search') || '';
    
    // Define pagination
    const ITEMS_PER_PAGE = 10;
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    // Build filtering conditions
    let whereClause = '1=1';
    const params: any[] = [];
    
    // Add status filter if not 'all'
    if (status !== 'all') {
      whereClause += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }
    
    // Add search term filter
    if (searchTerm) {
      whereClause += ` AND (
        b.booking_id ILIKE $${params.length + 1} OR
        u.name ILIKE $${params.length + 2} OR
        u.email ILIKE $${params.length + 3} OR
        u.phone ILIKE $${params.length + 4} OR
        v.name ILIKE $${params.length + 5}
      )`;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count first (in a separate query for better performance)
    const countSql = `
      SELECT COUNT(*) 
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Define the date fields to convert to IST
    const dateFields = ['start_date', 'end_date', 'created_at', 'updated_at'];
    
    // Build the main query with timezone handling
    const sqlQuery = `
      WITH booking_data AS (
        SELECT 
          b.id,
          b.user_id,
          b.vehicle_id,
          ${toISTSql('b.start_date')} as start_date,
          ${toISTSql('b.end_date')} as end_date,
          b.total_hours,
          b.total_price,
          b.status,
          b.payment_status,
          ${toISTSql('b.created_at')} as created_at,
          ${toISTSql('b.updated_at')} as updated_at,
          b.booking_id,
          v.name as vehicle_name,
          v.location as vehicle_location,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          
          -- Formatted dates as strings
          TO_CHAR(${toISTSql('b.start_date')}, 'DD Mon YYYY, HH12:MI AM') as formatted_pickup,
          TO_CHAR(${toISTSql('b.end_date')}, 'DD Mon YYYY, HH12:MI AM') as formatted_dropoff
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE ${whereClause}
      )
      SELECT * FROM booking_data
      ORDER BY created_at DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    
    // Execute the query
    const result = await query(sqlQuery, params);
    
    // Format the response
    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: ITEMS_PER_PAGE
      }
    });
  } catch (error) {
    logger.error('Failed to fetch admin bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
};

// Apply the timezone processing middleware to ensure consistent date formatting
export const GET = withTimezoneProcessing(getBookingsHandler);

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