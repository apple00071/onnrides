import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

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

    // Get booking details with vehicle
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq, and }) => 
        and(
          eq(bookings.id, bookingId),
          eq(bookings.user_id, session.user.id)
        ),
      with: {
        vehicle: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Format dates for message
    const pickupDate = new Date(booking.pickup_datetime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const dropoffDate = new Date(booking.dropoff_datetime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Send WhatsApp message using Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${session.user.phone}`,
      body: `🎉 Booking Confirmed!

Vehicle: ${booking.vehicle.name}
Pickup: ${pickupDate}
Drop-off: ${dropoffDate}
Booking ID: ${booking.id}

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