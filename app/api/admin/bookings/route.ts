import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatDateTimeIST } from '@/lib/utils/timezone';

interface BookingRow {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  ist_start_date?: string;
  ist_end_date?: string;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  vehicle_name: string;
  vehicle_type: string;
  payment_status?: string;
  payment_reference?: string;
  payment_method?: string;
  booking_type?: string;
  registration_number?: string;
  pickup_location?: string;
}

interface TransformedBooking {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  booking_type: string;
  created_at: string;
  updated_at: string;
  pickup_location?: string | null;
  vehicle: {
    id: string;
    name: string;
    type: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface PaymentDetails {
  documents?: Record<string, any>;
  method?: string;
  reference?: string;
  rental_amount?: number;
  security_deposit?: number;
  total_amount?: number;
  paid_amount?: number;
  notes?: string;
  signature?: string;
  location?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  // Legacy fields for backward compatibility
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  vehicleName?: string;
}

// Helper function to identify missing information
function identifyMissingInformation(booking: any): string[] {
  const missingInfo: string[] = [];

  // Check for essential customer information
  if (!booking.user_name) missingInfo.push('Customer Name');
  if (!booking.user_phone) missingInfo.push('Customer Phone');

  // For offline bookings, check for required documents
  if (booking.booking_type === 'offline') {
    const documents = booking.documents || {};
    if (!documents.dlFront) missingInfo.push('DL Front');
    if (!documents.dlBack) missingInfo.push('DL Back');
    if (!documents.aadhaarFront) missingInfo.push('Aadhaar Front');
    if (!documents.aadhaarBack) missingInfo.push('Aadhaar Back');
    if (!documents.customerPhoto) missingInfo.push('Customer Photo');
    if (!documents.signature) missingInfo.push('Signature');
  }

  return missingInfo;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get bookings with related data
    const queryText = `
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.id as vehicle_id,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.customer_name
          ELSE u.name
        END as effective_user_name,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.customer_phone
          ELSE u.phone
        END as effective_user_phone,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.email
          ELSE u.email
        END as effective_user_email,
        COALESCE(v.name, 'Vehicle not assigned') as effective_vehicle_name,
        b.registration_number,
        b.start_date::text as start_date,
        b.end_date::text as end_date,
        b.created_at::text as created_at,
        b.updated_at::text as updated_at,
        TRIM(BOTH '"' FROM b.pickup_location::text) as pickup_location
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM bookings');
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Map the data to match BookingWithRelations interface
    const mappedBookings = result.rows.map((booking: any) => {
      try {
        // For offline bookings with non-terminal statuses, show as 'active'
        const terminalStatuses = ['completed', 'cancelled', 'failed'];
        const status = (booking.booking_type === 'offline' && !terminalStatuses.includes(booking.status)) ? 'active' : booking.status;

        return {
          id: booking.id, // Return actual UUID
          booking_id: booking.booking_id, // Return actual ID from DB
          user_id: booking.user_id,
          vehicle_id: booking.vehicle_id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_price: parseFloat(String(booking.total_price)) || 0,
          status: status,
          payment_status: booking.payment_status || 'pending',
          payment_method: booking.payment_method || (booking.payment_details?.razorpay_payment_id ? 'Online' : null),
          payment_reference: booking.payment_reference || booking.payment_details?.razorpay_payment_id || booking.payment_details?.razorpay_order_id || null,
          booking_type: booking.booking_type || 'online',
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          registration_number: booking.registration_number,
          pickup_location: booking.pickup_location || null,
          vehicle: {
            id: booking.vehicle_id,
            name: booking.effective_vehicle_name,
            type: booking.vehicle_type
          },
          user: {
            id: booking.user_id,
            name: booking.effective_user_name,
            phone: booking.effective_user_phone,
            email: booking.effective_user_email
          },
          documents: {},
          missing_info: identifyMissingInformation({
            ...booking,
            user_name: booking.effective_user_name,
            user_phone: booking.effective_user_phone,
            documents: {}
          })
        };
      } catch (err: any) {
        console.error('Error mapping booking:', booking.id, err);
        throw err;
      }
    });

    return NextResponse.json({
      success: true,
      data: mappedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    });
  } catch (error) {
    logger.error('Error in bookings API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const bookingId = url.searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status is a known value
    const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'active', 'initiated', 'failed'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if booking exists and get current status
    const currentBookingResult = await query(`
      SELECT status FROM bookings WHERE id = $1
    `, [bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const currentStatus = currentBookingResult.rows[0].status;

    // Validate status transition
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled', 'failed'],
      confirmed: ['initiated', 'active', 'cancelled', 'completed'],
      initiated: ['active', 'completed', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      failed: ['pending']
    };

    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from '${currentStatus}' to '${status}'` },
        { status: 400 }
      );
    }

    // Update booking status
    const result = await query(`
      UPDATE bookings 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [status, bookingId]);

    const booking = result.rows[0];

    // Get booking details for notifications
    const bookingDetailsResult = await query(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.id as vehicle_id
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1
    `, [bookingId]);

    const bookingDetails = bookingDetailsResult.rows[0];

    // Handle vehicle availability based on status
    if (status === 'completed' || status === 'cancelled') {
      await query(`
        UPDATE vehicles 
        SET is_available = true, updated_at = NOW() 
        WHERE id = $1
      `, [bookingDetails.vehicle_id]);
    }

    return NextResponse.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const bookingId = url.searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Check for related records before deleting
    const relatedRecords = await query(`
      SELECT 
        (SELECT COUNT(*) FROM vehicle_returns WHERE booking_id = $1) as returns_count,
        (SELECT COUNT(*) FROM trip_initiations WHERE booking_id = $1) as initiations_count
    `, [bookingId]);

    const { returns_count, initiations_count } = relatedRecords.rows[0];
    if (parseInt(returns_count) > 0 || parseInt(initiations_count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete booking with existing return or trip records. Cancel the booking instead.' },
        { status: 400 }
      );
    }

    const deletedBookingResult = await query(`
      DELETE FROM bookings 
      WHERE id = $1 
      RETURNING *
    `, [bookingId]);

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