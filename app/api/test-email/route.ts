import { NextRequest, NextResponse } from 'next/server';
import { transporter, verifyEmailConfig } from '@/lib/email/config';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.info('Received test email request');
  
  try {
    // First verify the configuration
    logger.info('Verifying email configuration...');
    const isConfigValid = await verifyEmailConfig();
    
    if (!isConfigValid) {
      logger.error('Email configuration verification failed');
      return NextResponse.json(
        { 
          error: 'Email configuration verification failed',
          details: 'Failed to verify SMTP connection'
        },
        { status: 500 }
      );
    }

    // Get the test email address
    const { email } = await request.json();
    logger.info('Sending test email to:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send a test email with detailed HTML content
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'ONNRIDES Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f26e24; text-align: center;">Email Test Successful!</h1>
          <p>This is a test email to verify your email configuration.</p>
          <p>If you're seeing this, it means your email setup is working correctly!</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Used:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li>Environment: ${process.env.NODE_ENV}</li>
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT || '465'}</li>
              <li>From: ${process.env.SMTP_FROM}</li>
              <li>Secure: true</li>
              <li>TLS: Enabled (v1.2+)</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

    logger.info('Test email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      envelope: info.envelope
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });

  } catch (error) {
    logger.error('Test email error:', {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command,
        stack: error.stack
      } : 'Unknown error',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || '465',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        env: process.env.NODE_ENV
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 