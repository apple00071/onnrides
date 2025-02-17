import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { formatCurrency } from '@/lib/utils';
import logger from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Define admin notification recipients
const ADMIN_EMAILS = ['contact@onnrides.com', 'onnrides@gmail.com'];
const ADMIN_PHONES = ['8247494622', '9182495481'];

// Helper function to format date in IST
function formatDateIST(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Create sample booking data
    const sampleBooking = {
      booking_id: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      pickup_location: 'Hyderabad, Telangana',
      user_name: 'Test Customer',
      user_phone: '9876543210',
      vehicle_name: 'Royal Enfield Classic 350',
      start_date: new Date(),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
      total_price: 1499
    };

    const emailService = EmailService.getInstance();
    const whatsappService = WhatsAppService.getInstance();

    // Send notifications in parallel
    await Promise.all([
      // Send admin email notifications
      ...ADMIN_EMAILS.map(email => 
        emailService.sendEmail(
          email,
          'New Booking Received!',
          `
          <h1>New Booking Received!</h1>
          <p>Hurray!</p>
          <p>You have received a booking from OnnRides.</p>

          <h2>Booking Details:</h2>
          <ul>
            <li><strong>Order ID:</strong> ${sampleBooking.booking_id}</li>
            <li><strong>Location:</strong> ${sampleBooking.pickup_location}</li>
            <li><strong>Customer Name:</strong> ${sampleBooking.user_name}</li>
            <li><strong>Contact Number:</strong> ${sampleBooking.user_phone}</li>
            <li><strong>Vehicle Booked:</strong> ${sampleBooking.vehicle_name}</li>
            <li><strong>Pickup Date & Time:</strong> ${formatDateIST(sampleBooking.start_date)}</li>
            <li><strong>Drop Date & Time:</strong> ${formatDateIST(sampleBooking.end_date)}</li>
            <li><strong>Rental Amount Paid:</strong> ${formatCurrency(sampleBooking.total_price)}</li>
          </ul>
          `
        ).catch(error => {
          logger.error('Failed to send test admin email:', error);
          return null;
        })
      ),

      // Send admin WhatsApp notifications
      ...ADMIN_PHONES.map(phone =>
        whatsappService.sendMessage(
          phone,
          `🎉 New Booking Received!\n` +
          `Hurray!\n` +
          `You have received a booking from OnnRides.\n\n` +
          `Booking Details:\n` +
          `Order ID: ${sampleBooking.booking_id}\n` +
          `Location: ${sampleBooking.pickup_location}\n` +
          `Customer Name: ${sampleBooking.user_name}\n` +
          `Contact Number: ${sampleBooking.user_phone}\n` +
          `Vehicle Booked: ${sampleBooking.vehicle_name}\n` +
          `Pickup Date & Time: ${formatDateIST(sampleBooking.start_date)}\n` +
          `Drop Date & Time: ${formatDateIST(sampleBooking.end_date)}\n` +
          `Rental Amount Paid: ${formatCurrency(sampleBooking.total_price)}`
        ).catch(error => {
          logger.error('Failed to send test admin WhatsApp:', error);
          return null;
        })
      )
    ]);

    return NextResponse.json({
      success: true,
      message: 'Test notifications sent successfully',
      details: {
        emailsSentTo: ADMIN_EMAILS,
        whatsappSentTo: ADMIN_PHONES,
        sampleBooking
      }
    });
  } catch (error) {
    logger.error('Error sending test notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 