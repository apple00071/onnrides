import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
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

    // Start transaction
    await query('BEGIN');

    try {
      // Lock the booking row to prevent race conditions
      const bookingCheck = await query(
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
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }

      const bookingDetails = bookingCheck.rows[0];

      if (bookingDetails.status === 'completed') {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Vehicle already returned for this booking' },
          { status: 400 }
        );
      }
      // Generate a new UUID for the vehicle return
      const returnId = randomUUID();

      // Create vehicle return record
      const returnResult = await query(
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
      await query(
        `UPDATE bookings 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1`,
        [booking_id]
      );

      // If remaining payment was collected, update payment status
      if (remaining_payment_collected) {
        await query(
          `UPDATE bookings 
          SET payment_status = 'fully_paid', 
              payment_method = COALESCE(payment_method, $1),
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2`,
          [remaining_payment_method || 'cash', booking_id]
        );

        logger.info('Remaining payment collected for booking', {
          bookingId: booking_id,
          method: remaining_payment_method
        });
      }

      // Update vehicle availability (only if vehicle still exists)
      await query(
        `UPDATE vehicles
        SET is_available = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND EXISTS (SELECT 1 FROM vehicles WHERE id = $1)`,
        [bookingDetails.vehicle_id]
      );

      await query('COMMIT');

      // Send WhatsApp vehicle return confirmation
      try {
        const whatsappService = WhatsAppNotificationService.getInstance();
        const finalAmount = Number(bookingDetails.total_price) + (additional_charges || 0);

        await whatsappService.sendVehicleReturnConfirmation({
          booking_id: bookingDetails.booking_id,
          customer_name: bookingDetails.customer_name,
          customer_phone: bookingDetails.customer_phone,
          vehicle_model: bookingDetails.vehicle_name,
          vehicle_number: bookingDetails.vehicle_number,
          return_date: new Date(),
          condition_notes: condition_notes || undefined,
          additional_charges: additional_charges || 0,
          final_amount: finalAmount
        });

        logger.info('Vehicle return WhatsApp notification sent successfully', { bookingId: booking_id });
      } catch (whatsappError) {
        logger.error('Failed to send vehicle return WhatsApp notification:', whatsappError);
      }

      return NextResponse.json({
        success: true,
        data: returnResult.rows[0]
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error creating vehicle return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle return' },
      { status: 500 }
    );
  }
} 