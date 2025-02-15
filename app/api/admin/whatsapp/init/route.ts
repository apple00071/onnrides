import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';
import QRCode from 'qrcode';

const TIMEOUT_DURATION = 120000; // 2 minutes

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

    const whatsappService = WhatsAppService.getInstance();
    const status = whatsappService.getInitializationStatus();

    // If already initialized, return success
    if (status.isInitialized) {
      return NextResponse.json({
        status: 'connected'
      });
    }

    // Create a promise that will resolve with the QR code
    const qrPromise = new Promise<string>((resolve, reject) => {
      let qrReceived = false;
      let timeoutId: NodeJS.Timeout;

      // Set up QR code handler
      whatsappService.onQRCode(async (qr) => {
        if (qrReceived) return; // Only handle the first QR code
        qrReceived = true;
        
        // Clear timeout since we received the QR code
        if (timeoutId) clearTimeout(timeoutId);

        try {
          logger.info('QR code received, converting to base64...');
          // Convert QR code to base64 image
          const qrBase64 = await QRCode.toDataURL(qr);
          // Remove the data:image/png;base64, prefix
          const qrImage = qrBase64.split(',')[1];
          resolve(qrImage);
        } catch (error) {
          logger.error('Error converting QR code:', error);
          reject(error);
        }
      });

      // Set up ready handler
      whatsappService.onReady(() => {
        // Clear timeout since we're ready
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!qrReceived) {
          logger.info('WhatsApp client ready without QR code');
          resolve(''); // No QR needed, already authenticated
        }
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!qrReceived && !status.isInitialized) {
          logger.error('WhatsApp initialization timed out after', TIMEOUT_DURATION / 1000, 'seconds');
          reject(new Error(`WhatsApp initialization timed out after ${TIMEOUT_DURATION / 1000} seconds. Please try again.`));
        }
      }, TIMEOUT_DURATION);

      // Start initialization
      whatsappService.initialize().catch(error => {
        if (timeoutId) clearTimeout(timeoutId);
        logger.error('WhatsApp initialization failed:', error);
        reject(error);
      });
    });

    // Wait for QR code or ready state
    logger.info('Waiting for QR code or ready state...');
    const qrCode = await qrPromise;

    return NextResponse.json({
      status: qrCode ? 'connecting' : 'connected',
      qr: qrCode
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('WhatsApp initialization error:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize WhatsApp',
        details: errorMessage,
        retry: true
      },
      { status: 500 }
    );
  }
} 