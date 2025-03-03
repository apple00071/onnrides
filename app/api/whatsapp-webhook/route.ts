import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { headers } from 'next/headers';

// Mark as dynamic to ensure fresh data
export const dynamic = 'force-dynamic';

// Types for WhatsApp webhook events
interface WhatsAppWebhookData {
  instanceId: string;
  messageId: string;
  from: string;
  body: string;
  timestamp: number;
  ackStatus?: string;
}

interface WhatsAppWebhookBody {
  event: 'message' | 'message_ack' | 'group_join' | 'group_leave';
  timestamp: number;
  data: WhatsAppWebhookData;
}

// Validate API key middleware
const validateApiKey = (request: NextRequest): boolean => {
  const headersList = headers();
  const apiKey = headersList.get('x-api-key');
  return apiKey === 'onn7r1d3s_wh4ts4pp_ap1_s3cur3_k3y_9872354176';
};

// Handle incoming messages
async function handleIncomingMessage(data: WhatsAppWebhookData) {
  try {
    logger.info('Processing incoming WhatsApp message:', {
      messageId: data.messageId,
      from: data.from,
      timestamp: data.timestamp
    });

    // TODO: Implement message storage in database
    // For now, we'll just log it
    logger.debug('WhatsApp message content:', { body: data.body });

  } catch (error) {
    logger.error('Error handling incoming WhatsApp message:', error);
    throw error;
  }
}

// Handle message status updates
async function handleMessageStatus(data: WhatsAppWebhookData) {
  try {
    logger.info('Processing WhatsApp message status:', {
      messageId: data.messageId,
      status: data.ackStatus
    });

    // TODO: Implement status update in database
    // For now, we'll just log it
    logger.debug('WhatsApp message status update:', { 
      messageId: data.messageId, 
      status: data.ackStatus 
    });

  } catch (error) {
    logger.error('Error handling WhatsApp message status:', error);
    throw error;
  }
}

// Handle group events
async function handleGroupEvent(event: string, data: WhatsAppWebhookData) {
  logger.info(`Processing WhatsApp group event: ${event}`, {
    instanceId: data.instanceId,
    groupId: data.from
  });
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse webhook body
    const body: WhatsAppWebhookBody = await request.json();
    const { event, timestamp, data } = body;

    // Log incoming webhook
    logger.info('Received WhatsApp webhook:', { event, timestamp });

    // Process based on event type
    switch (event) {
      case 'message':
        await handleIncomingMessage(data);
        break;

      case 'message_ack':
        await handleMessageStatus(data);
        break;

      case 'group_join':
      case 'group_leave':
        await handleGroupEvent(event, data);
        break;

      default:
        logger.warn(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 