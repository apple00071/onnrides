import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyEmailConfig } from '@/lib/email/config';
import { sendTestEmail } from '@/lib/email/service';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First verify SMTP configuration
    const isConfigValid = await verifyEmailConfig();
    if (!isConfigValid) {
      return NextResponse.json(
        { success: false, error: 'Email configuration is invalid' },
        { status: 500 }
      );
    }

    // Send test email to admin's email
    await sendTestEmail(session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      sentTo: session.user.email
    });
  } catch (error) {
    logger.error('Failed to send test email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send test email',
        details: error
      },
      { status: 500 }
    );
  }
} 