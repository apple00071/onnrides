import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import { EmailService } from '@/lib/email/service';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Mark route as dynamic to allow server-only features
export const dynamic = 'force-dynamic';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/admin/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    
    const result = await query(`
      SELECT 
        b.id::text as id,
        b.booking_id,
        b.status,
        b.start_date,
        b.end_date,
        b.total_price,
        b.payment_status,
        b.pickup_location,
        b.user_id::text as user_id,
        b.vehicle_id::text as vehicle_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id::text = u.id::text
      LEFT JOIN vehicles v ON b.vehicle_id::text = v.id::text
      WHERE b.booking_id = $1
    `, [bookingId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching booking details:', { error: error instanceof Error ? error.message : 'Unknown error', bookingId: params.bookingId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/bookings/[bookingId] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Get current booking status before update
    const currentBookingResult = await query(`
      SELECT status FROM bookings WHERE booking_id = $1
    `, [bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const currentStatus = currentBookingResult.rows[0].status;

    // Update booking status
    const result = await query(`
      UPDATE bookings 
      SET 
        status = $1,
        updated_at = NOW()
      WHERE booking_id = $2
      RETURNING *, 
        start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_start_date,
        end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_end_date
    `, [status, bookingId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = result.rows[0];

    // Get more detailed booking information for notifications
    const bookingDetailsResult = await query(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.booking_id = $1
    `, [bookingId]);

    const bookingDetails = bookingDetailsResult.rows[0];

    // Only send notifications if status has actually changed
    if (currentStatus !== status) {
      try {
        // Initialize services
        const whatsappService = WhatsAppService.getInstance();
        const emailService = EmailService.getInstance();
        
        // Send notifications based on the new status
        switch (status) {
          case 'confirmed':
            await Promise.all([
              emailService.sendBookingConfirmation(
                bookingDetails.user_email,
                {
                  userName: bookingDetails.user_name,
                  vehicleName: bookingDetails.vehicle_name,
                  bookingId: bookingDetails.booking_id,
                  startDate: formatInTimeZone(booking.ist_start_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'),
                  endDate: formatInTimeZone(booking.ist_end_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'),
                  amount: bookingDetails.total_price.toString(),
                  paymentId: 'N/A'
                }
              ),
              whatsappService.sendBookingConfirmation({
                customerName: bookingDetails.user_name,
                customerPhone: bookingDetails.user_phone,
                vehicleType: 'Vehicle',
                vehicleModel: bookingDetails.vehicle_name,
                startDate: formatInTimeZone(booking.ist_start_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'),
                endDate: formatInTimeZone(booking.ist_end_date, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'),
                bookingId: bookingDetails.booking_id,
                totalAmount: bookingDetails.total_price.toString()
              }).catch((error: unknown) => {
                logger.warn('Failed to send WhatsApp notification:', {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  bookingId: bookingDetails.booking_id
                });
              })
            ]);
            break;

          case 'cancelled':
            // Make vehicle available again if cancelled
            if (bookingDetails.vehicle_id) {
              await query(`
                UPDATE vehicles 
                SET is_available = true 
                WHERE id = $1
              `, [bookingDetails.vehicle_id]);
            }

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
              ).catch((error: unknown) => {
                logger.warn('Failed to send WhatsApp notification:', {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  bookingId: bookingDetails.booking_id
                });
              })
            ]);
            break;

          // Add other status handling as needed
        }
      } catch (notificationError) {
        // Log notification errors but continue with the response
        logger.error('Error sending notifications:', {
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          bookingId: bookingDetails.booking_id
        });
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    logger.error('Error updating booking status:', { error: error instanceof Error ? error.message : 'Unknown error', bookingId: params.bookingId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedBookingResult = await query(`
      DELETE FROM bookings 
      WHERE id = $1 
      RETURNING *
    `, [params.bookingId]);

    if (deletedBookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking: deletedBookingResult.rows[0] });
  } catch (error) {
    logger.error('Error in DELETE /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 