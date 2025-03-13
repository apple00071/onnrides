import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import logger from '@/lib/logger';
import { AxiosError } from 'axios';
import { initializeWhatsAppService } from '@/lib/whatsapp/init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Log request details
        logger.info('WhatsApp test endpoint called', {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers)
        });

        // Initialize WhatsApp service first
        await initializeWhatsAppService();

        // Log environment variables (excluding sensitive data)
        logger.info('WhatsApp test configuration:', {
            apiUrl: process.env.WHATSAPP_API_URL,
            instanceId1: process.env.WHATSAPP_INSTANCE_ID_1,
            instanceId2: process.env.WHATSAPP_INSTANCE_ID_2,
            hasApiKey: !!process.env.WHATSAPP_API_KEY,
            apiKeyLength: process.env.WHATSAPP_API_KEY?.length,
            hasAdminPhone: !!process.env.ADMIN_PHONE,
            adminPhone: process.env.ADMIN_PHONE,
            nodeEnv: process.env.NODE_ENV
        });

        // Check required environment variables
        const requiredEnvVars = [
            'WHATSAPP_API_URL',
            'WHATSAPP_API_KEY',
            'WHATSAPP_INSTANCE_ID_1',
            'WHATSAPP_INSTANCE_ID_2',
            'ADMIN_PHONE'
        ];
        
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

        const testPhone = process.env.ADMIN_PHONE;
        if (!testPhone) {
            logger.error('Admin phone number is required but not found');
            return NextResponse.json(
                {
                    error: 'Admin phone number is required',
                    success: false
                },
                { status: 400 }
            );
        }

        const whatsapp = WhatsAppService.getInstance();
        
        logger.info('Sending test WhatsApp message...', {
            to: testPhone,
            instance: process.env.WHATSAPP_INSTANCE_ID_1
        });

        try {
            // Send a test message
            await whatsapp.sendTestMessage(testPhone);
            logger.info('Test WhatsApp message sent successfully');

            return NextResponse.json({
                success: true,
                message: 'Test WhatsApp message sent successfully',
                details: {
                    recipient: testPhone,
                    instance: process.env.WHATSAPP_INSTANCE_ID_1,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (sendError) {
            const axiosError = sendError instanceof AxiosError ? sendError : null;
            
            logger.error('Failed to send test WhatsApp message:', {
                error: sendError instanceof Error ? {
                    name: sendError.name,
                    message: sendError.message,
                    stack: sendError.stack
                } : sendError,
                config: axiosError?.config ? {
                    url: axiosError.config.url,
                    method: axiosError.config.method,
                    headers: axiosError.config.headers,
                    data: axiosError.config.data
                } : undefined,
                response: axiosError?.response ? {
                    status: axiosError.response.status,
                    statusText: axiosError.response.statusText,
                    data: axiosError.response.data
                } : undefined
            });

            throw sendError; // Re-throw to be caught by outer catch block
        }
    } catch (error) {
        const axiosError = error instanceof AxiosError ? error : null;
        
        logger.error('Error in WhatsApp test endpoint:', {
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error,
            config: axiosError?.config ? {
                url: axiosError.config.url,
                method: axiosError.config.method,
                headers: axiosError.config.headers,
                data: axiosError.config.data
            } : undefined,
            response: axiosError?.response ? {
                status: axiosError.response.status,
                statusText: axiosError.response.statusText,
                data: axiosError.response.data
            } : undefined
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send test WhatsApp message',
                details: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                    response: axiosError?.response?.data
                } : undefined
            },
            { status: 500 }
        );
    }
} 