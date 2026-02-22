import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';
import { createPaymentLink } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, reminder_type, payment_link } = body;

    if (!booking_id || !reminder_type) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and reminder type are required' },
        { status: 400 }
      );
    }

    // Get booking details with combined customer information (from users or custom booking fields)
    const bookingResult = await query(`
      SELECT 
        b.booking_id,
        b.total_price,
        b.total_amount,
        b.paid_amount,
        b.pending_amount,
        b.rental_amount,
        b.security_deposit_amount,
        b.booking_type,
        b.status,
        b.start_date,
        COALESCE(b.customer_name, u.name) as customer_name,
        COALESCE(b.phone_number, u.phone) as customer_phone,
        COALESCE(b.email, u.email) as customer_email,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1
    `, [booking_id]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Only send reminders for bookings that are not completed or cancelled
    const allowedStatuses = ['pending', 'confirmed', 'active'];
    if (!allowedStatuses.includes(booking.status.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Payment reminders cannot be sent for ${booking.status} bookings` },
        { status: 400 }
      );
    }

    // Recalculate balance due
    const totalAmount = booking.booking_type === 'offline'
      ? (Math.round(parseFloat(booking.rental_amount || '0')) + Math.round(parseFloat(booking.security_deposit_amount || '0')))
      : (Math.round(parseFloat(booking.total_amount || booking.total_price || '0')));

    const paidAmount = Math.round(parseFloat(booking.paid_amount || '0'));
    const balanceDue = Math.max(0, totalAmount - paidAmount);

    if (balanceDue <= 0 && booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'No balance due for this booking' },
        { status: 400 }
      );
    }

    // Auto-generate payment link if not provided
    let finalPaymentLink = payment_link;
    if (!finalPaymentLink && balanceDue > 0) {
      try {
        finalPaymentLink = await createPaymentLink({
          amount: balanceDue,
          reference_id: booking.booking_id,
          description: `Payment for booking ${booking.booking_id}`,
          customer: {
            name: booking.customer_name,
            contact: booking.customer_phone,
            email: booking.customer_email
          }
        });
      } catch (linkError) {
        logger.error('Failed to auto-generate payment link:', linkError);
        // Continue without link
      }
    }


    // Send WhatsApp payment reminder
    const whatsappService = WhatsAppNotificationService.getInstance();
    const result = await whatsappService.sendPaymentReminder({
      booking_id: booking.booking_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      vehicle_model: booking.vehicle_name,
      amount_due: balanceDue,
      due_date: new Date(booking.start_date), // Use start date as due date
      payment_link: finalPaymentLink || undefined,
      reminder_type: reminder_type as 'first' | 'second' | 'final'
    });

    if (result) {
      logger.info('Payment reminder sent successfully', {
        bookingId: booking.booking_id,
        reminderType: reminder_type
      });

      return NextResponse.json({
        success: true,
        message: 'Payment reminder sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send payment reminder' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error sending payment reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send payment reminder' },
      { status: 500 }
    );
  }
}

// GET endpoint to get bookings that need payment reminders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending bookings with combined customer info
    const result = await query(`
      SELECT 
        b.id,
        b.booking_id,
        b.total_price,
        b.total_amount,
        b.paid_amount,
        b.pending_amount,
        b.rental_amount,
        b.security_deposit_amount,
        b.booking_type,
        b.start_date,
        b.created_at,
        b.status,
        COALESCE(b.customer_name, u.name) as customer_name,
        COALESCE(b.phone_number, u.phone) as customer_phone,
        COALESCE(b.email, u.email) as customer_email,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE (b.status = 'pending' OR b.status = 'confirmed' OR b.status = 'active')
      ORDER BY b.created_at DESC
    `);

    const processedBookings = result.rows.map(booking => {
      const totalAmount = booking.booking_type === 'offline'
        ? (Math.round(parseFloat(booking.rental_amount || '0')) + Math.round(parseFloat(booking.security_deposit_amount || '0')))
        : (Math.round(parseFloat(booking.total_amount || booking.total_price || '0')));

      const paidAmount = Math.round(parseFloat(booking.paid_amount || '0'));
      const pendingAmount = Math.max(0, totalAmount - paidAmount);

      return {
        ...booking,
        total_price: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount
      };
    }).filter(b => b.pending_amount > 0 || b.status === 'pending');

    return NextResponse.json({
      success: true,
      data: processedBookings
    });

  } catch (error) {
    logger.error('Error fetching pending bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending bookings' },
      { status: 500 }
    );
  }
}
