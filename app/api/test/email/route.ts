import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Test route for admin to verify email functionality
 * This should be called with a POST request and email data
 * Example body: { email: "test@example.com" }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get email from request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    logger.info('Running email test', {
      targetEmail: email,
      user: session.user.email
    });

    // Get email service status
    const emailService = EmailService.getInstance();
    const status = emailService.getInitializationStatus();

    if (!status.isInitialized) {
      logger.error('Email service not initialized correctly', {
        error: status.error?.message || 'Unknown error'
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Email service not initialized correctly',
          details: status.error?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Send test email
    const messageId = await emailService.sendEmail(
      email,
      'OnnRides Email System Test',
      `
        <h2>Email System Test</h2>
        <p>This is a test email from OnnRides to verify the email system is working correctly.</p>
        <p>If you're receiving this email, it means the email system is functioning properly.</p>
        <p>Test timestamp: ${new Date().toISOString()}</p>
        <p>Sent by admin: ${session.user.email}</p>
      `,
      null // no booking ID for this test
    );

    logger.info('Test email sent successfully', {
      messageId,
      recipient: email
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        recipient: email,
        messageId: messageId
      }
    });
  } catch (error) {
    logger.error('Error sending test email:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 