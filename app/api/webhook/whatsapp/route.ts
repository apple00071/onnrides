import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

// POST request handler for incoming messages and events
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log incoming webhook
    logger.info('Received WhatsApp webhook:', body);

    // Process the webhook data
    // Add your webhook processing logic here

    // Returns a '200 OK' response to all requests
    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Handle incoming messages
async function handleIncomingMessage(data: any) {
  try {
    const messages = data.messages;
    if (!messages || !messages.length) return;

    for (const message of messages) {
      // Log the incoming message
      logger.info('Received WhatsApp message:', {
        from: message.from,
        type: message.type,
        timestamp: message.timestamp,
        messageId: message.id,
      });

      // TODO: Process different types of messages (text, media, etc.)
      // and implement your business logic here
    }
  } catch (error) {
    logger.error('Error handling incoming message:', error);
    throw error;
  }
} 