import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../../lib/ultramsg/config';
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
        
        // Send a test message with current timestamp
        const timestamp = new Date().toLocaleString();
        const message = `🔔 Onnrides WhatsApp Test Message\n\n` +
            `This is a test message sent at: ${timestamp}\n\n` +
            `Your phone number: ${testPhone}\n` +
            `Instance ID: ${process.env.ULTRAMSG_INSTANCE_ID}\n` +
            `If you receive this message, the WhatsApp integration is working correctly! 🎉`;

        logger.info('Sending test message:', { 
            message,
            phone: testPhone,
            formattedPhone: testPhone.replace(/\D/g, '').startsWith('91') ? testPhone.replace(/\D/g, '') : `91${testPhone.replace(/\D/g, '')}`
        });

        const success = await sendWhatsAppMessage(testPhone, message);

        if (!success) {
            throw new Error('Failed to send WhatsApp message');
        }

        logger.info('WhatsApp test result:', { success });

        return NextResponse.json({
            success: true,
            message: 'Test message sent successfully',
            timestamp,
            details: {
                recipient: testPhone,
                message
            }
        });
    } catch (error) {
        logger.error('WhatsApp Test Error:', {
            error,
            config: {
                instanceId: process.env.ULTRAMSG_INSTANCE_ID,
                testPhone: process.env.TEST_PHONE_NUMBER,
                hasToken: !!process.env.ULTRAMSG_TOKEN,
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : error
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