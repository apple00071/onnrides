import { NextRequest, NextResponse } from 'next/server';
import { transporter } from '@/lib/email/config';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // First verify the connection
    logger.info('Verifying SMTP connection...');
    await transporter.verify();
    logger.info('SMTP connection verified successfully');

    // Get the test email address
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send a test email
    logger.info('Sending test email to:', email);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'ONNRIDES Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f26e24; text-align: center;">Email Test Successful!</h1>
          <p>This is a test email to verify your email configuration.</p>
          <p>If you're seeing this, it means your email setup is working correctly!</p>
          <p>Configuration used:</p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>From: ${process.env.SMTP_FROM}</li>
          </ul>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    logger.info('Test email sent successfully:', {
      messageId: info.messageId,
      response: info.response
    });

    return NextResponse.json({
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        response: info.response
      }
    });

  } catch (error) {
    logger.error('Test email error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM
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