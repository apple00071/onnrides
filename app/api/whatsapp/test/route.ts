import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../../lib/ultramsg/config';
import logger from '@/lib/logger';

export async function GET(req: Request) {
    try {
        // Log environment information
        logger.info('WhatsApp Test Environment:', {
            node_env: process.env.NODE_ENV,
            vercel_env: process.env.VERCEL_ENV,
            ultramsg_config: {
                instance_id: process.env.ULTRAMSG_INSTANCE_ID,
                has_token: !!process.env.ULTRAMSG_TOKEN
            }
        });

        // Get phone number from query parameters
        const url = new URL(req.url);
        const phone = url.searchParams.get('phone');

        if (!phone) {
            logger.error('Missing phone number in request');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Phone number is required'
                },
                { status: 400 }
            );
        }

        if (!process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) {
            logger.error('Missing UltraMsg configuration:', {
                has_instance_id: !!process.env.ULTRAMSG_INSTANCE_ID,
                has_token: !!process.env.ULTRAMSG_TOKEN
            });
            return NextResponse.json(
                {
                    success: false,
                    error: 'UltraMsg configuration is incomplete'
                },
                { status: 400 }
            );
        }

        // Format the test message
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const message = `🔔 Onnrides WhatsApp Test Message\n\n` +
            `This is a test message sent at: ${timestamp}\n\n` +
            `Environment: ${process.env.NODE_ENV}\n` +
            `Your phone number: ${phone}\n` +
            `Instance ID: ${process.env.ULTRAMSG_INSTANCE_ID}\n` +
            `If you receive this message, the WhatsApp integration is working correctly! 🎉`;

        logger.info('Attempting to send test message:', {
            phone,
            message_length: message.length,
            timestamp
        });

        const success = await sendWhatsAppMessage(phone, message);

        if (!success) {
            logger.error('Failed to send test message');
            throw new Error('Failed to send WhatsApp message');
        }

        logger.info('Test message sent successfully');

        return NextResponse.json({
            success: true,
            message: 'Test message sent successfully',
            timestamp,
            environment: process.env.NODE_ENV,
            details: {
                recipient: phone,
                message
            }
        });
    } catch (error) {
        logger.error('WhatsApp Test Error:', {
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error,
            environment: {
                node_env: process.env.NODE_ENV,
                vercel_env: process.env.VERCEL_ENV
            },
            config: {
                instance_id: process.env.ULTRAMSG_INSTANCE_ID,
                has_token: !!process.env.ULTRAMSG_TOKEN
            }
        });
        
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toLocaleString(),
                environment: process.env.NODE_ENV,
                details: error instanceof Error ? {
                    name: error.name,
                    message: error.message
                } : error
            },
            { status: 500 }
        );
    }
} 