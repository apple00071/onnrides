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

    const user = session?.user;
    const isAuthorized =
      user?.role?.toLowerCase() === 'admin' ||
      user?.permissions?.manage_bookings;

    if (!isAuthorized) {
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

    const user = session?.user;
    const isAuthorized =
      user?.role?.toLowerCase() === 'admin' ||
      user?.permissions?.manage_bookings;

    if (!isAuthorized) {
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
      logger.info('Starting vehicle return transaction', { booking_id });

      // Lock the booking row to prevent race conditions
      const bookingCheck = await client.query(
        `SELECT
          b.id,
          b.booking_id,
          b.status,
          b.vehicle_id,
          b.total_price,
          b.pending_amount,
          b.registration_number as vehicle_number,
          b.security_deposit_amount,
          COALESCE(b.customer_name, u.name) as customer_name,
          COALESCE(b.phone_number, u.phone) as customer_phone,
          v.name as vehicle_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.id = $1
        FOR UPDATE OF b`,
        [booking_id]
      );

      if (bookingCheck.rows.length === 0) {
        logger.error('Booking not found during vehicle return', { booking_id });
        throw new Error('Booking not found');
      }

      const bookingDetails = bookingCheck.rows[0];

      if (bookingDetails.status === 'completed') {
        logger.warn('Attempted duplicate vehicle return', { booking_id });
        throw new Error('Vehicle already returned for this booking');
      }

      // Calculate Settlement Amounts
      const pendingAmount = Number(bookingDetails.pending_amount || 0);
      const addCharges = Number(additional_charges || 0);
      const deductions = Number(security_deposit_deductions || 0);
      const securityDeposit = Number(bookingDetails.security_deposit_amount || 0);

      // Net Refund = Available Deposit - (Pending Balance + Add Charges)
      // If positive, we refund. If negative, we collect.
      const availableDeposit = Math.max(0, securityDeposit - deductions);
      const grossDue = pendingAmount + addCharges;
      const netAmount = availableDeposit - grossDue;

      logger.info('Settlement calculation', {
        booking_id,
        pendingAmount,
        addCharges,
        deductions,
        securityDeposit,
        netAmount
      });

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
        )`,
        [
          returnId,
          booking_id,
          condition_notes || '',
          JSON.stringify(damages || []),
          addCharges,
          odometer_reading || 0,
          fuel_level || 100,
          'completed',
          session.user.id,
          deductions,
          Math.max(0, netAmount < 0 ? 0 : netAmount), // Refund amount
          remaining_payment_method || 'cash',
          deduction_reasons || null
        ]
      );

      // Update booking status to completed and clear balance
      await client.query(
        `UPDATE bookings 
        SET status = 'completed', 
            payment_status = 'fully_paid',
            pending_amount = 0,
            paid_amount = total_price,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1`,
        [booking_id]
      );

      // Record the Settlement Transaction in Payments table
      if (netAmount !== 0) {
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
            randomUUID(),
            booking_id,
            -netAmount, // If netAmount is -500 (Collect 500), payment amount is +500. If netAmount is +500 (Refund 500), payment amount is -500.
            netAmount > 0 ? 'refunded' : 'completed',
            remaining_payment_method || 'cash',
            `settlement_${bookingDetails.booking_id}_${Date.now()}`
          ]
        );

        logger.info('Settlement payment recorded', {
          bookingId: booking_id,
          netAmount,
          method: remaining_payment_method
        });
      }

      // Release Vehicle
      // Removed automatic flip: is_available should be a manual admin control only

      // Store booking details for notification outside transaction
      Object.assign(bookingDetailsForNotification, bookingDetails);
      bookingDetailsForNotification.additional_charges = addCharges;
      bookingDetailsForNotification.net_settlement = netAmount;
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
        final_amount: bookingDetailsForNotification.total_price,
        security_deposit_refund_amount: bookingDetailsForNotification.net_settlement > 0 ? bookingDetailsForNotification.net_settlement : undefined,
        security_deposit_refund_method: remaining_payment_method || undefined
      });

      logger.info('Vehicle return WhatsApp notification sent successfully', { bookingId: booking_id });
    } catch (whatsappError) {
      logger.error('Failed to send vehicle return WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle return processed successfully',
      data: {
        bookingId: booking_id
      }
    });

  } catch (error) {
    logger.error('Error creating vehicle return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle return' },
      { status: 500 }
    );
  }
} 