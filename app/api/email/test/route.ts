import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export async function GET(req: Request) {
    try {
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
        const timestamp = new Date().toLocaleString();
        const result = await email.sendEmail(
            testEmail,
            'OnnRides Email Test',
            `
            <h1>🔔 Onnrides Email Test</h1>
            <p>This is a test email sent at: ${timestamp}</p>
            <p>Your email address: ${testEmail}</p>
            <p>If you receive this email, the email integration is working correctly! 🎉</p>
            <hr>
            <p><strong>Email Configuration:</strong></p>
            <ul>
                <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                <li>From: ${process.env.SMTP_FROM}</li>
            </ul>
            `
        );

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            timestamp,
            details: {
                messageId: result.messageId,
                logId: result.logId,
                recipient: testEmail
            }
        });
    } catch (error) {
        logger.error('Email Test Error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toLocaleString(),
                details: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : error
            },
            { status: 500 }
        );
    }
} 