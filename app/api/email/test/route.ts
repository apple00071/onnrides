import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
    try {
        // Check all required environment variables
        const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

        if (missingEnvVars.length > 0) {
            logger.error('Missing required environment variables:', { missing: missingEnvVars });
            return NextResponse.json(
                {
                    error: 'Missing required environment variables',
                    details: missingEnvVars,
                    success: false
                },
                { status: 400 }
            );
        }

        const testEmail = process.env.SUPPORT_EMAIL;
        if (!testEmail) {
            return NextResponse.json(
                {
                    error: 'SUPPORT_EMAIL environment variable is not set',
                    success: false
                },
                { status: 400 }
            );
        }

        const email = EmailService.getInstance();
        
        // Send a test email with current timestamp
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const result = await email.sendEmail(
            testEmail,
            'OnnRides Email Test',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #f26e24; text-align: center;">🔔 Onnrides Email Test</h1>
                <p>This is a test email sent at: ${timestamp}</p>
                <p>Your email address: ${testEmail}</p>
                <p>If you receive this email, the email integration is working correctly! 🎉</p>
                <hr>
                <p><strong>Email Configuration:</strong></p>
                <ul>
                    <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                    <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                    <li>From: ${process.env.SMTP_FROM}</li>
                    <li>Environment: ${process.env.NODE_ENV}</li>
                </ul>
            </div>
            `
        );

        logger.info('Test email sent successfully', {
            recipient: testEmail,
            messageId: result.messageId,
            timestamp
        });

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            timestamp,
            details: {
                messageId: result.messageId,
                logId: result.logId,
                recipient: testEmail,
                config: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    from: process.env.SMTP_FROM,
                    user: process.env.SMTP_USER?.substring(0, 5) + '...'
                }
            }
        });
    } catch (error) {
        logger.error('Failed to send test email:', {
            error,
            config: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER?.substring(0, 5) + '...',
                from: process.env.SMTP_FROM
            }
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send test email',
                details: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : undefined
            },
            { status: 500 }
        );
    }
} 