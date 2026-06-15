import { NextRequest, NextResponse } from 'next/server';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const adminNotificationService = AdminNotificationService.getInstance();
    
    // Send notification to admins via AdminNotificationService
    await adminNotificationService.sendNotification({
      type: 'system',
      title: '📞 New Contact Query Received',
      message: `A customer has sent a message from the contact form.`,
      data: {
        'Customer Name': name,
        'Email Address': email,
        'Phone Number': phone,
        'Message': message
      }
    });

    logger.info('Contact message forwarded to admin notification service:', { name, email });
    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Error handling contact message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
