import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Check required environment variables
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

        const testEmail = process.env.SUPPORT_EMAIL || 'support@onnrides.com';
        const emailService = EmailService.getInstance();
        
        // Send a test email with current timestamp and configuration details
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #f26e24;">OnnRides Email Test</h1>
                <p>This is a test email sent at: ${timestamp}</p>
                
                <h2>Email Configuration:</h2>
                <ul>
                    <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                    <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                    <li>SMTP User: ${process.env.SMTP_USER?.substring(0, 3)}...</li>
                    <li>From: ${process.env.SMTP_FROM}</li>
                </ul>
                
                <p>If you receive this email, the email integration is working correctly! 🎉</p>
            </div>
        `;

        const { messageId, logId } = await emailService.sendEmail(
            testEmail,
            'OnnRides Email Test',
            emailContent
        );

        const responseContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                ${emailContent}
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    Message ID: ${messageId}<br>
                    Log ID: ${logId}
                </p>
            </div>
        `;

        logger.info('Test email sent successfully', {
            messageId,
            logId,
            recipient: testEmail,
            timestamp
        });

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            details: {
                messageId,
                logId,
                recipient: testEmail,
                timestamp,
                config: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER?.substring(0, 3) + '...',
                    from: process.env.SMTP_FROM
                }
            }
        });
    } catch (error) {
        logger.error('Failed to send test email:', {
            error,
            config: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER?.substring(0, 3) + '...',
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