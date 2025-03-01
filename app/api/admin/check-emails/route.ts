import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Only allow admins to use this API
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get email addresses from environment variable or query param
    const { searchParams } = new URL(request.url);
    let emailsToTest = searchParams.get('email') ? 
      [searchParams.get('email')!] : 
      (process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []);

    // Log email configuration
    logger.info('Checking email configuration:', {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT,
      smtp_user: process.env.SMTP_USER?.substring(0, 3) + '...',
      smtp_from: process.env.SMTP_FROM,
      admin_emails: emailsToTest
    });

    // Initialize Email Service
    const emailService = EmailService.getInstance();
    
    // Create detailed HTML content with delivery timestamp
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    });
    
    const results = [];
    
    // Send test emails to each admin email
    for (const email of emailsToTest) {
      try {
        if (!email) continue;
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 5px;">
            <h1 style="color: #f26e24;">OnnRides Admin Email Test</h1>
            <p>This is a test email to verify admin notifications are working correctly.</p>
            
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p><strong>Delivery Information:</strong></p>
              <ul>
                <li>Sent at: ${timestamp}</li>
                <li>Recipient: ${email}</li>
                <li>Server: ${process.env.VERCEL_ENV || 'Development'}</li>
                <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              </ul>
            </div>
            
            <p>If you received this email, admin notifications should be working properly! 🎉</p>
            <p>Please check the following:</p>
            <ul>
              <li>Is this email in your inbox? If it's in spam, add the sender to your contacts.</li>
              <li>How long did it take to arrive? The send time was ${timestamp}.</li>
              <li>Are all formatting and images displayed correctly?</li>
            </ul>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
              This is an automated test from OnnRides. Please do not reply to this email.
            </p>
          </div>
        `;
        
        const { messageId, logId } = await emailService.sendEmail(
          email,
          'OnnRides Admin Email Test',
          htmlContent
        );
        
        results.push({
          email,
          success: true,
          messageId,
          logId,
          timestamp
        });
        
        logger.info(`Test email sent to admin ${email}`, {
          messageId,
          logId,
          timestamp
        });
      } catch (error) {
        logger.error(`Failed to send test email to ${email}:`, error);
        
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp
        });
      }
    }
    
    // Return the results
    return NextResponse.json({
      success: true,
      timestamp,
      results,
      environment: {
        smtp_host: process.env.SMTP_HOST,
        smtp_port: process.env.SMTP_PORT,
        smtp_user: process.env.SMTP_USER?.substring(0, 3) + '...',
        smtp_from: process.env.SMTP_FROM,
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV
      }
    });
  } catch (error) {
    logger.error('Error in admin email check endpoint:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run email check',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 