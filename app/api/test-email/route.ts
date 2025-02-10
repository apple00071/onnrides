import { NextRequest, NextResponse } from 'next/server';
import { transporter, verifyEmailConfig } from '@/lib/email/config';

export async function POST(request: NextRequest) {
  console.log('Received test email request');
  
  try {
    // First verify the configuration
    console.log('Verifying email configuration...');
    const isConfigValid = await verifyEmailConfig();
    
    if (!isConfigValid) {
      console.error('Email configuration verification failed');
      return NextResponse.json(
        { error: 'Email configuration verification failed' },
        { status: 500 }
      );
    }

    // Get the test email address
    const { email } = await request.json();
    console.log('Sending test email to:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send a test email
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
            <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>From: ${process.env.SMTP_FROM}</li>
          </ul>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    console.log('Test email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      envelope: info.envelope
    });

    return NextResponse.json({
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });

  } catch (error) {
    console.error('Test email error:', {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command,
        stack: error.stack
      } : 'Unknown error',
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