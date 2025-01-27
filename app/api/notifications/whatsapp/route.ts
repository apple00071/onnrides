import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();

    // Get booking details with vehicle using raw SQL
    const booking = await query(`
      SELECT b.*, v.* 
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1 AND b.user_id = $2
      LIMIT 1
    `, [bookingId, session.user.id]);

    if (!booking?.[0]) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Format dates for message
    const pickupDate = new Date(booking[0].pickup_datetime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const dropoffDate = new Date(booking[0].dropoff_datetime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Send WhatsApp message using Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${session.user.phone}`,
      body: `🎉 Booking Confirmed!

Vehicle: ${booking[0].vehicle.name}
Pickup: ${pickupDate}
Drop-off: ${dropoffDate}
Booking ID: ${booking[0].id}

Thank you for choosing OnnRides! Drive safe! 🚗`,
    });

    logger.info('WhatsApp notification sent:', message.sid);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error sending WhatsApp notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 