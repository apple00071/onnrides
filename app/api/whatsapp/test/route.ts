import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Check required environment variables
        const requiredEnvVars = ['ULTRAMSG_TOKEN', 'ULTRAMSG_INSTANCE_ID'];
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

        const testPhone = '8247494622'; // Your test phone number
        const whatsapp = WhatsAppService.getInstance();
        
        // Send a test message with current timestamp
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const result = await whatsapp.sendMessage(
            testPhone,
            `🔔 OnnRides WhatsApp Test\n\nThis is a test message sent at: ${timestamp}\n\nIf you receive this message, the WhatsApp integration is working correctly! 🎉`
        );

        logger.info('Test WhatsApp message sent successfully', {
            messageId: result.id,
            timestamp,
            recipient: testPhone
        });

        return NextResponse.json({
            success: true,
            message: 'Test WhatsApp message sent successfully',
            timestamp,
            details: {
                messageId: result.id,
                recipient: testPhone,
                config: {
                    instanceId: process.env.ULTRAMSG_INSTANCE_ID,
                    hasToken: !!process.env.ULTRAMSG_TOKEN
                }
            }
        });
    } catch (error) {
        logger.error('Failed to send test WhatsApp message:', {
            error,
            config: {
                instanceId: process.env.ULTRAMSG_INSTANCE_ID,
                hasToken: !!process.env.ULTRAMSG_TOKEN
            }
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send test WhatsApp message',
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