import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const resultData: any = {};
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { payment_method = 'cash', amount } = body;

    // Get current booking details
    const bookingResult = await query(
      `SELECT 
        id, booking_id, payment_status, pending_amount, paid_amount, total_amount
      FROM bookings 
      WHERE booking_id = $1`,
      [resolvedParams.bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];
    const pendingAmount = parseFloat(booking.pending_amount) || 0;
    const paidAmount = parseFloat(booking.paid_amount) || 0;
    const collectAmount = amount ? parseFloat(amount) : pendingAmount;

    if (pendingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'No pending payment for this booking' },
        { status: 400 }
      );
    }

    if (collectAmount > pendingAmount) {
      return NextResponse.json(
        { success: false, error: 'Collection amount cannot exceed pending amount' },
        { status: 400 }
      );
    }

    // Use withTransaction helper from @/lib/db to ensure all queries run on the same client
    await withTransaction(async (client) => {
      // Update payment details
      const newPaidAmount = paidAmount + collectAmount;
      const newPendingAmount = pendingAmount - collectAmount;
      const newPaymentStatus = newPendingAmount <= 0 ? 'completed' : 'partially_paid';

      await client.query(
        `UPDATE bookings 
        SET 
          paid_amount = $1,
          pending_amount = $2,
          payment_status = $3,
          payment_method = COALESCE(payment_method, $4),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5`,
        [newPaidAmount, newPendingAmount, newPaymentStatus, payment_method, booking.id]
      );

      // Create a record in the payments table for the audit trail
      const paymentId = randomUUID();
      await client.query(
        `INSERT INTO payments (
          id,
          booking_id,
          amount,
          status,
          method,
          reference,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          paymentId,
          booking.id,
          collectAmount,
          'completed',
          payment_method,
          body.payment_reference || 'Manual collection'
        ]
      );

      logger.info('Payment collected for booking', {
        bookingId: resolvedParams.bookingId,
        amount: collectAmount,
        method: payment_method,
        newStatus: newPaymentStatus
      });

      // Pass values back to external scope
      Object.assign(resultData, {
        collected_amount: collectAmount,
        new_paid_amount: newPaidAmount,
        new_pending_amount: newPendingAmount,
        payment_status: newPaymentStatus
      });
    });

    return NextResponse.json({
      success: true,
      data: resultData
    });

  } catch (error) {
    logger.error('Error collecting payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to collect payment' },
      { status: 500 }
    );
  }
}
