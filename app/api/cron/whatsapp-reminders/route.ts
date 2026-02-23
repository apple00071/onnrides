import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppNotificationService } from '../../../../lib/whatsapp/notification-service';
import { WhatsAppReminderService } from '../../../../lib/whatsapp/reminder-service';

// This endpoint can be called by external cron services like Vercel Cron or GitHub Actions
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a trusted source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not configured');
      return NextResponse.json({
        success: false,
        error: 'Server misconfigured'
      }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Cron Auth Failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 15),
        cronSecretLength: cronSecret?.length
      });
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('Starting scheduled WhatsApp reminders...');

    // TEMPORARY: One-time test heartbeat for admin
    const notificationService = WhatsAppNotificationService.getInstance();
    await notificationService.sendAdminAlert('pickup' as any, {
      booking_id: 'SYSTEM_CHECK',
      customer_name: 'Cronjob Verification',
      vehicle_model: 'Heartbeat Check',
      start_date: new Date(),
      end_date: new Date(),
      total_amount: 0,
      status: 'testing',
      pickup_location: 'Cloud Server'
    } as any);

    const reminderService = WhatsAppReminderService.getInstance();
    await reminderService.runAllReminders();

    console.log('Scheduled WhatsApp reminders completed successfully');

    return NextResponse.json({
      success: true,
      message: 'WhatsApp reminders sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in scheduled WhatsApp reminders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminders',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
