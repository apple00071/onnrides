import { NextResponse } from 'next/server';
import { query, withTransaction } from '../../../../lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM vehicle_returns'
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get vehicle returns with related data
    const returns = await query(
      `SELECT 
        vr.*,
        b.booking_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        u.name as user_name,
        u.email as user_email,
        admin.name as processed_by_name
      FROM vehicle_returns vr
      JOIN bookings b ON vr.booking_id = b.id
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users admin ON vr.processed_by = admin.id
      ORDER BY vr.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: returns.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    });

  } catch (error) {
    logger.error('Error fetching vehicle returns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle returns' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      booking_id,
      condition_notes,
      damages,
      additional_charges,
      odometer_reading,
      fuel_level,
      status,
      remaining_payment_collected,
      remaining_payment_method,
      security_deposit_deductions,
      security_deposit_refund_amount,
      security_deposit_refund_method,
      deduction_reasons
    } = body;

    // Validate required fields
    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    let bookingDetailsForNotification: any = {};

    // Start transaction using withTransaction helper
    await withTransaction(async (client: any) => {
      // Lock the booking row to prevent race conditions
      const bookingCheck = await client.query(
        `SELECT
          b.id,
          b.booking_id,
          b.status,
          b.vehicle_id,
          b.total_price,
          b.registration_number as vehicle_number,
          u.name as customer_name,
          u.phone as customer_phone,
          v.name as vehicle_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.id = $1
        FOR UPDATE OF b`,
        [booking_id]
      );

      if (bookingCheck.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const bookingDetails = bookingCheck.rows[0];

      if (bookingDetails.status === 'completed') {
        throw new Error('Vehicle already returned for this booking');
      }
      // Generate a new UUID for the vehicle return
      const returnId = randomUUID();

      // Create vehicle return record
      await client.query(
        `INSERT INTO vehicle_returns (
          id,
          booking_id,
          condition_notes,
          damages,
          additional_charges,
          odometer_reading,
          fuel_level,
          status,
          processed_by,
          security_deposit_deductions,
          security_deposit_refund_amount,
          security_deposit_refund_method,
          deduction_reasons,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *`,
        [
          returnId,
          booking_id,
          condition_notes || '',
          JSON.stringify(damages || []), // Convert array to JSON string
          additional_charges || 0,
          odometer_reading || 0,
          fuel_level || 100,
          'completed',
          session.user.id,
          security_deposit_deductions || 0,
          security_deposit_refund_amount || 0,
          security_deposit_refund_method || null,
          deduction_reasons || null
        ]
      );

      // Update booking status to completed
      await client.query(
        `UPDATE bookings 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1`,
        [booking_id]
      );

      // If remaining payment was collected, update payment status and create payment record
      if (remaining_payment_collected) {
        await client.query(
          `UPDATE bookings 
          SET payment_status = 'fully_paid', 
              payment_method = COALESCE(payment_method, $1),
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2`,
          [remaining_payment_method || 'cash', booking_id]
        );

        // Calculate remaining 95% amount for online bookings
        const remainingAmount = Math.round(bookingDetails.total_price * 0.95);

        // Create payment record for remaining balance collection
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
          ) VALUES ($1, $2, $3, 'completed', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            booking_id,
            remainingAmount,
            remaining_payment_method || 'cash',
            `balance_${bookingDetails.booking_id}_${Date.now()}`
          ]
        );

        logger.info('Remaining payment collected and recorded', {
          bookingId: booking_id,
          amount: remainingAmount,
          method: remaining_payment_method
        });
      }

      // Create payment record for additional charges if any
      if (additional_charges && additional_charges > 0) {
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
          ) VALUES ($1, $2, $3, 'completed', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            booking_id,
            additional_charges,
            remaining_payment_method || 'cash',
            `additional_${bookingDetails.booking_id}_${Date.now()}`
          ]
        );

        logger.info('Additional charges recorded', {
          bookingId: booking_id,
          amount: additional_charges,
          method: remaining_payment_method || 'cash'
        });
      }

      // Create payment record for security deposit refund if applicable
      if (security_deposit_refund_amount && security_deposit_refund_amount > 0) {
        // Record refund as a negative payment (outgoing cash)
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
          ) VALUES ($1, $2, $3, 'refunded', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            booking_id,
            -security_deposit_refund_amount, // Negative amount for refund
            security_deposit_refund_method || 'cash',
            `deposit_refund_${bookingDetails.booking_id}_${Date.now()}`
          ]
        );

        logger.info('Security deposit refund recorded', {
          bookingId: booking_id,
          amount: security_deposit_refund_amount,
          method: security_deposit_refund_method
        });
      }

      // Update vehicle availability (only if vehicle still exists)
      await client.query(
        `UPDATE vehicles
        SET is_available = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND EXISTS (SELECT 1 FROM vehicles WHERE id = $1)`,
        [bookingDetails.vehicle_id]
      );

      // Store booking details for notification outside transaction
      Object.assign(bookingDetailsForNotification, bookingDetails);
    });

    // Send WhatsApp vehicle return confirmation
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      const finalAmount = Number(bookingDetailsForNotification.total_price) + (additional_charges || 0);

      await whatsappService.sendVehicleReturnConfirmation({
        booking_id: bookingDetailsForNotification.booking_id,
        customer_name: bookingDetailsForNotification.customer_name,
        customer_phone: bookingDetailsForNotification.customer_phone,
        vehicle_model: bookingDetailsForNotification.vehicle_name,
        vehicle_number: bookingDetailsForNotification.vehicle_number,
        return_date: new Date(),
        condition_notes: condition_notes || undefined,
        additional_charges: additional_charges || 0,
        final_amount: finalAmount
      });

      logger.info('Vehicle return WhatsApp notification sent successfully', { bookingId: booking_id });
    } catch (whatsappError) {
      logger.error('Failed to send vehicle return WhatsApp notification:', whatsappError);
    }

  } catch (error) {
    logger.error('Error creating vehicle return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle return' },
      { status: 500 }
    );
  }
} 