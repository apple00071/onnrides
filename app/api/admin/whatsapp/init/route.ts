import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeWhatsApp } from '@/lib/whatsapp/config';
import logger from '@/lib/logger';
import QRCode from 'qrcode';
import { isServerless } from '@/lib/utils/environment';

const TIMEOUT_DURATION = 25000; // 25 seconds

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max duration

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In serverless environment, return a specific message
    if (isServerless()) {
      return NextResponse.json({
        status: 'unavailable',
        message: 'WhatsApp initialization is not available in serverless environment. Please use a dedicated server.'
      }, { status: 400 });
    }

    // Initialize WhatsApp
    try {
      await initializeWhatsApp();
      
      return NextResponse.json({
        status: 'success',
        message: 'WhatsApp initialized successfully'
      });
    } catch (error) {
      logger.error('WhatsApp initialization error:', error);
      return NextResponse.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('WhatsApp initialization error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 