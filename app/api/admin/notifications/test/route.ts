import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

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

    const adminNotificationService = AdminNotificationService.getInstance();

    // Get admin recipients
    const adminEmails = adminNotificationService['getAdminEmails']();
    const adminPhones = adminNotificationService['getAdminPhones']();

    // Send booking notification
    const bookingNotificationResult = await adminNotificationService.sendBookingNotification(sampleBooking);

    // Also send a payment notification
    const paymentNotificationResult = await adminNotificationService.sendPaymentNotification({
      booking_id: sampleBooking.booking_id,
      payment_id: 'PAY-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      user_name: sampleBooking.user_name,
      amount: sampleBooking.total_price,
      payment_method: 'Test Card',
      status: 'success',
      transaction_time: new Date()
    });

    // Custom test notification
    const customNotificationResult = await adminNotificationService.sendNotification({
      type: 'test',
      title: 'Admin Notification Test',
      message: 'This is a test of the admin notification system. If you received this, it means the notification system is working correctly.',
      data: {
        test_id: 'TEST-' + Date.now(),
        timestamp: new Date(),
        sender: session.user.email || 'Unknown',
        environment: process.env.NODE_ENV || 'development'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test notifications sent successfully',
      booking: bookingNotificationResult,
      payment: paymentNotificationResult,
      custom: customNotificationResult,
      details: {
        configuredEmails: adminEmails,
        configuredPhones: adminPhones,
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