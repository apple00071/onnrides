import { NextRequest, NextResponse } from 'next/server';
import { initializeWhatsAppService } from '@/lib/whatsapp/init';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure Node.js runtime

let isInitialized = false;

export async function GET(request: NextRequest) {
    try {
        // Only initialize once
        if (!isInitialized) {
            await initializeWhatsAppService();
            isInitialized = true;
            logger.info('WhatsApp service initialized via API route');
        }

        return NextResponse.json({ 
            success: true, 
            message: 'WhatsApp service initialized successfully' 
        });
    } catch (error) {
        logger.error('Failed to initialize WhatsApp service:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to initialize WhatsApp service' 
        }, { status: 500 });
    }
} 