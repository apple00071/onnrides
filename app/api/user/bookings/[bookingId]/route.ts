import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get booking details with user and vehicle information
    const { rows: [booking] } = await query(
      `SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
       FROM bookings b 
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.user_id = u.id 
       WHERE b.id = $1::uuid AND b.user_id = $2 
       LIMIT 1`,
      [params.bookingId, session.user.id]
    );

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Format the response with all necessary fields for payment
    const formattedBooking = {
      id: booking.id,
      user_id: booking.user_id,
      vehicle_id: booking.vehicle_id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_price: booking.total_price,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_intent_id: booking.payment_intent_id,
      user_name: booking.user_name,
      user_email: booking.user_email,
      user_phone: booking.user_phone,
      vehicle_name: booking.vehicle_name,
      vehicle_type: booking.vehicle_type,
      vehicle_location: booking.vehicle_location
    };

    // Include Razorpay key for payment initialization
    return NextResponse.json({
      success: true,
      booking: formattedBooking,
      razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });
  } catch (error) {
    logger.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
} 