import { NextResponse } from 'next/server';
import { query, withTransaction } from '../../../../../lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';
import { randomUUID } from 'crypto';

interface BookingRow {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  status: string;
  total_price: string;
  paid_amount: string;
  pending_amount: string;
  start_date: Date;
  end_date: Date;
  [key: string]: any;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const result = await query(`
      SELECT
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.registration_number as vehicle_registration_number,
        ti.vehicle_number as trip_vehicle_number,
        TRIM(BOTH '"' FROM b.pickup_location::text) as pickup_location_clean,
        vr.additional_charges,
        vr.condition_notes,
        vr.created_at as return_date,
        ti.checklist_details,
        ti.fuel_level,
        ti.odometer_reading,
        ti.damage_notes,
        ti.cleanliness_notes,
        ti.documents as trip_documents,
        ti.customer_name as ti_customer_name,
        ti.customer_phone as ti_customer_phone,
        ti.customer_email as ti_customer_email,
        ti.customer_dl_number as ti_dl_number,
        ti.customer_aadhaar_number as ti_aadhaar_number
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN vehicle_returns vr ON b.id = vr.booking_id
      LEFT JOIN trip_initiations ti ON b.id = ti.booking_id
      WHERE TRIM(b.booking_id) ILIKE TRIM($1)
    `, [resolvedParams.bookingId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];

    // Determine customer information based on booking type
    const customerInfo = booking.booking_type === 'offline' ? {
      id: booking.user_id,
      name: booking.customer_name,
      email: booking.email,
      phone: booking.phone_number,
      alternate_phone: booking.alternate_phone,
      aadhar_number: booking.aadhar_number,
      father_number: booking.father_number,
      mother_number: booking.mother_number,
      date_of_birth: booking.date_of_birth,
      dl_number: booking.dl_number,
      dl_expiry_date: booking.dl_expiry_date,
      permanent_address: booking.permanent_address,
      documents: {
        dl_scan: booking.dl_scan,
        aadhar_scan: booking.aadhar_scan,
        selfie: booking.selfie
      }
    } : {
      id: booking.user_id,
      name: booking.user_name,
      email: booking.user_email,
      phone: booking.user_phone,
      alternate_phone: null,
      aadhar_number: null,
      father_number: null,
      mother_number: null,
      date_of_birth: null,
      dl_number: null,
      dl_expiry_date: null,
      permanent_address: null,
      documents: {
        dl_scan: null,
        aadhar_scan: null,
        selfie: null
      }
    };

    const formattedData = {
      id: booking.id,
      booking_id: booking.booking_id,
      created_at: booking.created_at,
      customer: customerInfo,
      vehicle: {
        name: booking.vehicle_name,
        type: booking.vehicle_type,
        model: booking.vehicle_model,
        registration_number: booking.trip_vehicle_number || booking.vehicle_registration_number || booking.registration_number
      },
      amount: booking.booking_type === 'offline'
        ? (Math.round(parseFloat(booking.rental_amount || '0')) + Math.round(parseFloat(booking.security_deposit_amount || '0')))
        : (Math.round(parseFloat(booking.total_price)) || 0),
      rental_amount: Math.round(parseFloat(booking.rental_amount)) || 0,
      security_deposit_amount: Math.round(parseFloat(booking.security_deposit_amount)) || 0,
      total_amount: booking.booking_type === 'offline'
        ? (Math.round(parseFloat(booking.rental_amount || '0')) + Math.round(parseFloat(booking.security_deposit_amount || '0')))
        : (Math.round(parseFloat(booking.total_amount)) || 0),
      paid_amount: Math.round(parseFloat(booking.paid_amount)) || 0,
      pending_amount: Math.round(parseFloat(booking.pending_amount)) || 0,
      payment_method: booking.payment_method,
      payment_reference: booking.payment_reference,
      status: booking.status,
      payment_status: booking.payment_status,
      booking_type: booking.booking_type,
      pickup_location: booking.pickup_location_clean,
      duration: {
        from: booking.start_date,
        to: booking.end_date
      },
      vehicle_return: booking.additional_charges ? {
        additional_charges: booking.additional_charges,
        condition_notes: booking.condition_notes,
        return_date: booking.return_date
      } : undefined,
      notes: booking.notes,
      terms_accepted: booking.terms_accepted,
      trip_initiation: booking.ti_customer_name ? {
        checklist_details: booking.checklist_details,
        fuel_level: booking.fuel_level,
        odometer_reading: booking.odometer_reading,
        damage_notes: booking.damage_notes,
        cleanliness_notes: booking.cleanliness_notes,
        documents: booking.trip_documents,
        customer_name: booking.ti_customer_name,
        customer_phone: booking.ti_customer_phone,
        customer_email: booking.ti_customer_email,
        dl_number: booking.ti_dl_number,
        aadhaar_number: booking.ti_aadhaar_number
      } : null
    };

    // Add payment breakdown separately for cleaner syntax
    const paymentsResult = await query(`
      SELECT method, SUM(amount) as total_amount
      FROM payments
      WHERE booking_id = $1
      GROUP BY method
    `, [booking.id]);

    (formattedData as any).payment_breakdown = paymentsResult.rows.map(row => ({
      method: row.method,
      amount: parseFloat(row.total_amount)
    }));

    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    logger.error('Error fetching booking details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
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
    const {
      status,
      start_date,
      end_date,
      vehicle_id,
      pickup_location,
      total_price,
      modification_reason
    } = body;

    // Get current booking details for comparison
    const currentBookingResult = await query(`
      SELECT
        b.*,
        COALESCE(b.customer_name, u.name) as user_name,
        COALESCE(b.phone_number, u.phone) as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE TRIM(b.booking_id) ILIKE TRIM($1)
    `, [resolvedParams.bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const currentBooking = currentBookingResult.rows[0];
    const modifications = [];

    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (status && status !== currentBooking.status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
      modifications.push(`Status: ${currentBooking.status} → ${status}`);
    }

    if (start_date && start_date !== currentBooking.start_date.toISOString()) {
      updateFields.push(`start_date = $${paramIndex++}`);
      updateValues.push(new Date(start_date));
      modifications.push(`Start Date: ${currentBooking.start_date.toISOString().split('T')[0]} → ${new Date(start_date).toISOString().split('T')[0]}`);
    }

    if (end_date && end_date !== currentBooking.end_date.toISOString()) {
      updateFields.push(`end_date = $${paramIndex++}`);
      updateValues.push(new Date(end_date));
      modifications.push(`End Date: ${currentBooking.end_date.toISOString().split('T')[0]} → ${new Date(end_date).toISOString().split('T')[0]}`);
    }

    if (vehicle_id && vehicle_id !== currentBooking.vehicle_id) {
      updateFields.push(`vehicle_id = $${paramIndex++}`);
      updateValues.push(vehicle_id);

      // Get new vehicle name
      const newVehicleResult = await query(`SELECT name FROM vehicles WHERE id = $1`, [vehicle_id]);
      const newVehicleName = newVehicleResult.rows[0]?.name || 'Unknown Vehicle';
      modifications.push(`Vehicle: ${currentBooking.vehicle_name} → ${newVehicleName}`);
    }

    if (pickup_location && pickup_location !== currentBooking.pickup_location) {
      updateFields.push(`pickup_location = $${paramIndex++}`);
      updateValues.push(pickup_location);
      modifications.push(`Pickup Location: ${currentBooking.pickup_location || 'Not set'} → ${pickup_location}`);
    }

    if (total_price && total_price !== currentBooking.total_price) {
      updateFields.push(`total_price = $${paramIndex++}`);
      updateValues.push(total_price);
      modifications.push(`Total Price: ₹${currentBooking.total_price} → ₹${total_price}`);

      // High Severity: Recalculate pending_amount when total_price changes
      const newPendingAmount = parseFloat(total_price) - parseFloat(currentBooking.paid_amount || '0');
      updateFields.push(`pending_amount = $${paramIndex++}`);
      updateValues.push(newPendingAmount);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(resolvedParams.bookingId);

    // Execute update inside a transaction
    let updatedBooking;
    await withTransaction(async (client: any) => {
      const result = await client.query(`
        UPDATE bookings
        SET ${updateFields.join(', ')}
        WHERE TRIM(booking_id) ILIKE TRIM($${paramIndex})
        RETURNING *
      `, updateValues);

      updatedBooking = result.rows[0];

      // Handle vehicle availability atomically based on status
      if (status === 'completed' || status === 'cancelled') {
        const vehicleId = vehicle_id || currentBooking.vehicle_id;
        await client.query(`
          UPDATE vehicles
          SET is_available = true, updated_at = NOW()
          WHERE id = $1
        `, [vehicleId]);

        // If status is completed, ensure we log the payment in the 'payments' table 
        // if there was a pending balance that is now implicitly cleared or paid
        if (status === 'completed' && currentBooking.status !== 'completed') {
          const pendingAmount = parseFloat(currentBooking.pending_amount || '0');
          if (pendingAmount > 0) {
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
                currentBooking.id,
                pendingAmount,
                'completed',
                currentBooking.payment_method || 'cash',
                'Manual completion'
              ]
            );

            // Also update the booking's paid_amount and pending_amount to maintain integrity
            await client.query(
              `UPDATE bookings SET 
                paid_amount = total_price,
                pending_amount = 0,
                payment_status = 'completed',
                updated_at = NOW()
               WHERE id = $1`,
              [currentBooking.id]
            );

            logger.info('Auto-resolved balance during manual completion', {
              bookingId: currentBooking.id,
              clearedAmount: pendingAmount
            });
          } else {
            // Even if pendingAmount is 0, ensure payment_status is 'completed'
            await client.query(
              `UPDATE bookings SET 
                payment_status = 'completed',
                updated_at = NOW()
               WHERE id = $1`,
              [currentBooking.id]
            );
          }
        }
      } else if (status === 'confirmed' || status === 'initiated') {
        const vehicleId = vehicle_id || currentBooking.vehicle_id;
        await client.query(`
          UPDATE vehicles
          SET is_available = false, updated_at = NOW()
          WHERE id = $1
        `, [vehicleId]);
      }
    });

    // Refresh booking details for notifications
    const bookingDetailsResult = await query(`
      SELECT 
        b.*,
        COALESCE(b.customer_name, u.name) as user_name,
        COALESCE(b.email, u.email) as user_email,
        COALESCE(b.phone_number, u.phone) as user_phone,
        v.name as vehicle_name,
        v.id as vehicle_id
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE TRIM(b.booking_id) ILIKE TRIM($1)
    `, [resolvedParams.bookingId]);

    const bookingDetails = bookingDetailsResult.rows[0];

    // Send WhatsApp notifications based on changes made
    if (modifications.length > 0 && currentBooking) {
      try {
        const whatsappService = WhatsAppNotificationService.getInstance();

        // Check if status changed to cancelled or completed
        const statusChange = modifications.find(mod => mod.includes('Status:'));
        if (statusChange) {
          if (statusChange.includes('→ cancelled')) {
            await whatsappService.sendBookingCancellation({
              booking_id: currentBooking.booking_id,
              customer_name: currentBooking.user_name,
              customer_phone: currentBooking.user_phone,
              vehicle_model: currentBooking.vehicle_name,
              start_date: new Date(currentBooking.start_date),
              end_date: new Date(currentBooking.end_date),
              cancellation_reason: modification_reason || 'Cancelled by admin',
              refund_amount: currentBooking.total_price,
              refund_status: 'Processing'
            });

            logger.info('Admin booking cancellation WhatsApp notification sent', { bookingId: resolvedParams.bookingId });
          } else if (statusChange.includes('→ completed')) {
            await whatsappService.sendBookingCompletion({
              booking_id: currentBooking.booking_id,
              customer_name: currentBooking.user_name,
              customer_phone: currentBooking.user_phone,
              vehicle_model: currentBooking.vehicle_name,
              start_date: new Date(currentBooking.start_date),
              end_date: new Date(currentBooking.end_date),
              total_amount: currentBooking.total_price
            });

            logger.info('Booking completion WhatsApp notification sent', { bookingId: resolvedParams.bookingId });
          }
        }

        // Send general modification notification for non-status changes
        const nonStatusModifications = modifications.filter(mod => !mod.includes('Status:'));
        if (nonStatusModifications.length > 0) {
          const modificationType = nonStatusModifications.some(mod => mod.includes('Date')) ? 'dates' :
            nonStatusModifications.some(mod => mod.includes('Vehicle')) ? 'vehicle' :
              nonStatusModifications.some(mod => mod.includes('Location')) ? 'location' : 'other';

          await whatsappService.sendBookingModification({
            booking_id: currentBooking.booking_id,
            customer_name: currentBooking.user_name,
            customer_phone: currentBooking.user_phone,
            modification_type: modificationType,
            old_details: nonStatusModifications.map(mod => mod.split(' → ')[0].split(': ')[1]).join(', '),
            new_details: nonStatusModifications.map(mod => mod.split(' → ')[1]).join(', '),
            modified_by: session.user.name || session.user.email || 'Admin'
          });

          logger.info('Booking modification WhatsApp notification sent', {
            bookingId: resolvedParams.bookingId,
            modifications: nonStatusModifications
          });
        }
      } catch (whatsappError) {
        logger.error('Failed to send WhatsApp notification for booking changes:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Get booking
    const bookingResult = await query(`
      SELECT * FROM bookings
      WHERE TRIM(booking_id) ILIKE TRIM($1)
      LIMIT 1
    `, [resolvedParams.bookingId]);
    const booking = bookingResult.rows[0];

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    const internalId = booking.id;

    // Check for related records before deleting

    const relatedRecords = await query(`
      SELECT 
        (SELECT COUNT(*) FROM vehicle_returns WHERE booking_id = $1) as returns_count,
        (SELECT COUNT(*) FROM trip_initiations WHERE booking_id = $1) as initiations_count
    `, [internalId]);

    const { returns_count, initiations_count } = relatedRecords.rows[0];
    if (parseInt(returns_count) > 0 || parseInt(initiations_count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete booking with existing return or trip records. Cancel the booking instead.' },
        { status: 400 }
      );
    }

    const deletedBookingResult = await query(`
      DELETE FROM bookings
      WHERE TRIM(booking_id) ILIKE TRIM($1)
      RETURNING *
    `, [resolvedParams.bookingId]);

    if (deletedBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedBookingResult.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
} 