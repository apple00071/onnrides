import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import QRCode from 'qrcode';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, amount } = await request.json();
    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: 'Booking ID and amount are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Get booking details
      const bookingResult = await client.query(`
        SELECT b.*, v.name as vehicle_name, 
        CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) as user_name
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE b.id = $1 AND b.user_id = $2
      `, [bookingId, user.id]);

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      const booking = bookingResult.rows[0];

      // Generate payment reference
      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Create payment record
      await client.query(`
        UPDATE bookings 
        SET payment_status = 'pending', 
            payment_reference = $1
        WHERE id = $2
      `, [paymentRef, bookingId]);

      // Generate QR code data
      const qrData = JSON.stringify({
        paymentRef,
        amount,
        bookingId,
        vehicleName: booking.vehicle_name,
        userName: booking.user_name,
        pickupDateTime: booking.pickup_datetime,
        dropoffDateTime: booking.dropoff_datetime
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(qrData);

      return NextResponse.json({
        success: true,
        qrCode,
        paymentRef,
        bookingDetails: {
          ...booking,
          amount
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
} 