import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';

export async function GET(req: Request) {
    try {
        const testPhone = process.env.TEST_PHONE_NUMBER;
        if (!testPhone) {
            return NextResponse.json(
                {
                    error: 'TEST_PHONE_NUMBER environment variable is not set',
                    success: false
                },
                { status: 400 }
            );
        }

        logger.info('Starting WhatsApp test with configuration:', {
            instanceId: process.env.ULTRAMSG_INSTANCE_ID,
            testPhone,
            hasToken: !!process.env.ULTRAMSG_TOKEN
        });

        const whatsapp = WhatsAppService.getInstance();
        
        // Send a test message with current timestamp
        const timestamp = new Date().toLocaleString();
        const message = `🔔 Onnrides WhatsApp Test Message\n\n` +
            `This is a test message sent at: ${timestamp}\n\n` +
            `Your phone number: ${testPhone}\n` +
            `Instance ID: ${process.env.ULTRAMSG_INSTANCE_ID}\n` +
            `If you receive this message, the WhatsApp integration is working correctly! 🎉`;

        logger.info('Sending test message:', { message });

        const result = await whatsapp.sendMessage(testPhone, message);

        logger.info('WhatsApp test result:', {
            success: true,
            messageId: result.messageId,
            response: result.response
        });

        return NextResponse.json({
            success: true,
            message: 'Test message sent successfully',
            timestamp,
            details: {
                messageId: result.messageId,
                logId: result.logId,
                recipient: testPhone,
                apiResponse: result.response,
                message
            }
        });
    } catch (error) {
        logger.error('WhatsApp Test Error:', {
            error,
            config: {
                instanceId: process.env.ULTRAMSG_INSTANCE_ID,
                testPhone: process.env.TEST_PHONE_NUMBER,
                hasToken: !!process.env.ULTRAMSG_TOKEN
            }
        });
        
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