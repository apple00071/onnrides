import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

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

    // Parse request body
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json({
        status: 'error',
        error: 'Missing required fields: to, message'
      }, { status: 400 });
    }

    // Send message using WhatsApp service
    try {
      const whatsappService = WhatsAppService.getInstance();
      await whatsappService.sendMessage(to, message);
      
      return NextResponse.json({
        status: 'success',
        message: 'Message sent successfully'
      });
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      return NextResponse.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to send message'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('WhatsApp send error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 