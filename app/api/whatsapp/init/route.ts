import { NextRequest, NextResponse } from 'next/server';
import { initializeWhatsAppService } from '@/lib/whatsapp/init';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure Node.js runtime

let isInitialized = false;

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logger.warn('Unauthorized WhatsApp initialization attempt');
            return NextResponse.json({ 
                success: false, 
                error: 'Unauthorized access' 
            }, { status: 401 });
        }

        // Only initialize once
        if (!isInitialized) {
            try {
                await initializeWhatsAppService();
                isInitialized = true;
                logger.info('WhatsApp service initialized via API route');
            } catch (initError) {
                logger.error('WhatsApp initialization error:', initError);
                return NextResponse.json({ 
                    success: false, 
                    error: initError instanceof Error ? initError.message : 'Failed to initialize WhatsApp service' 
                }, { status: 500 });
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'WhatsApp service initialized successfully' 
        });
    } catch (error) {
        logger.error('Failed to initialize WhatsApp service:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp service' 
        }, { status: 500 });
    }
} 