import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth/config';
import { query } from '@/lib/db';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import { 
  buildTimezoneAwareQuery, 
  toISTSql, 
  selectWithISTDates 
} from '@/lib/utils/sql-helpers';
import { withTimezoneProcessing } from '@/middleware/timezone-middleware';
import { generateBookingId } from '@/lib/utils/booking-id';
import { formatInTimeZone } from 'date-fns-tz';

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
  if (!amount) return '₹0';
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  } catch (error) {
    logger.error('Error formatting amount:', error);
    return '₹0';
  }
}

// Helper function to generate unique booking ID
// function generateBookingId(): string {
//   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//   let result = 'OR';
//   for (let i = 0; i < 3; i++) {
//     result += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return result;
// }

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
    
    // Use the ITEMS_PER_PAGE constant
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
      SELECT COUNT(*)::integer 
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id::text = v.id::text
      LEFT JOIN users u ON b.user_id::text = u.id::text
      WHERE ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Build the main query with timezone handling
    const sqlQuery = `
      WITH booking_data AS (
        SELECT 
          b.id,
          b.booking_id,
          b.user_id,
          b.vehicle_id,
          
          -- Store original UTC dates without modification
          b.start_date as original_start_date,
          b.end_date as original_end_date,
          
          -- Add debug fields to check what's happening with the dates
          TO_CHAR(b.start_date, 'YYYY-MM-DD HH24:MI:SS TZ') as utc_start_date_str,
          
          -- Apply IST conversion (+5:30 hours) only once
          (b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as ist_start_date,
          (b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as ist_end_date,
          
          b.total_hours,
          b.total_price,
          b.status,
          b.payment_status,
          b.payment_details,
          b.pickup_location,
          b.dropoff_location,
          b.created_at,
          b.updated_at,
          (b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as ist_created_at,
          (b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as ist_updated_at,
          v.name as vehicle_name,
          v.location as vehicle_location,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          
          -- Formatted pickup/dropoff times for display with proper timezone conversion
          TO_CHAR(b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_pickup,
          TO_CHAR(b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_dropoff,
          
          -- Include additional debug information
          TO_CHAR(b.start_date, 'YYYY-MM-DD HH24:MI:SS') as db_start_time,
          TO_CHAR(b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_start_time,
          
          -- Calculate duration in hours for debugging
          EXTRACT(EPOCH FROM (b.end_date - b.start_date))/3600 as calculated_duration_hours
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id::text = v.id::text
        LEFT JOIN users u ON b.user_id::text = u.id::text
        WHERE ${whereClause}
      )
      SELECT * FROM booking_data
      ORDER BY ist_created_at DESC
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
  const emailService = EmailService.getInstance();
  const whatsappService = WhatsAppService.getInstance();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { bookingId, action } = await request.json();

    if (!bookingId || !action) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    if (action === 'cancel') {
      try {
        // Begin transaction
        await query('BEGIN');

        // Update booking status and payment status
        const updateResult = await query(`
          UPDATE bookings 
          SET 
            status = 'cancelled',
            payment_status = 'cancelled',
            updated_at = NOW()
          WHERE booking_id = $1::uuid 
          RETURNING *,
            start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_start_date,
            end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_end_date
        `, [bookingId]);

        if (updateResult.rowCount === 0) {
          throw new Error('Booking not found');
        }

        const booking = updateResult.rows[0];

        // Get user and vehicle details for the notification
        const detailsResult = await query(`
          SELECT 
            b.*,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            v.name as vehicle_name
          FROM bookings b
          LEFT JOIN users u ON b.user_id = u.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.booking_id = $1::uuid
        `, [bookingId]);
        
        const bookingDetails = detailsResult.rows[0];

        // Send cancellation notifications
        try {
          await Promise.all([
            emailService.sendEmail(
              bookingDetails.user_email,
              'Booking Cancellation - OnnRides',
              `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #f26e24;">Booking Cancelled</h1>
                <p>Dear ${bookingDetails.user_name},</p>
                <p>Your booking has been cancelled by the administrator.</p>
                
                <h2>Booking Details:</h2>
                <ul>
                  <li>Booking ID: ${bookingDetails.booking_id}</li>
                  <li>Vehicle: ${bookingDetails.vehicle_name}</li>
                  <li>Start Date: ${formatInTimeZone(booking.ist_start_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a')}</li>
                  <li>End Date: ${formatInTimeZone(booking.ist_end_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a')}</li>
                </ul>
                
                <p>If you have any questions, please contact our support team:</p>
                <ul>
                  <li>Email: support@onnrides.com</li>
                  <li>Phone: +91 8247494622</li>
                </ul>
              </div>
              `,
              bookingDetails.booking_id
            ),
            whatsappService.sendBookingCancellation(
              bookingDetails.user_phone,
              bookingDetails.user_name,
              bookingDetails.vehicle_name,
              bookingDetails.booking_id
            ).catch(error => {
              // Log WhatsApp error but don't fail the transaction
              logger.warn('Failed to send WhatsApp notification:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                bookingId: bookingDetails.booking_id
              });
            })
          ]);
        } catch (notificationError) {
          // Log notification error but don't fail the transaction
          logger.error('Error sending notifications:', {
            error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
            bookingId: bookingDetails.booking_id
          });
        }

        await query('COMMIT');

        return NextResponse.json({ 
          success: true,
          message: 'Booking cancelled successfully'
        });
      } catch (error) {
        await query('ROLLBACK');
        logger.error('Error cancelling booking:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          bookingId
        });
        throw error;
      }
    }

    return NextResponse.json({ 
      success: false,
      error: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    logger.error('Error in booking operation:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process booking operation'
    }, { status: 500 });
  }
} 