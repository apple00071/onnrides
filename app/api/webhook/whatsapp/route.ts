import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { verifyWebhookSignature } from '@/lib/whatsapp/verify-signature';

// GET request handler for webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get the verification tokens from the query
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Log verification attempt
    logger.info('WhatsApp Webhook verification attempt:', {
      mode,
      token,
      challenge,
    });

    // Your verify token should match what you set in Meta Dashboard
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (!VERIFY_TOKEN) {
      logger.error('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
      return new Response('Webhook verify token not configured', { status: 500 });
    }

    // Verify the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      logger.info('WhatsApp Webhook verified successfully');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Responds with '403 Forbidden' if verify tokens do not match
    logger.warn('WhatsApp Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    logger.error('Error in WhatsApp webhook verification:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST request handler for incoming messages and events
export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Log incoming webhook
    logger.info('Received WhatsApp webhook:', {
      object: body.object,
      entry: body.entry?.length,
    });

    // Verify the request is from Meta/WhatsApp
    const signature = request.headers.get('x-hub-signature-256');
    const isValid = await verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

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