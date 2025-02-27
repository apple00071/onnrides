import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import logger from '@/lib/logger';

export async function GET() {
  try {
    // Test message parameters
    const testPhone = "918309031203"; // Your business phone number
    
    // Test with a simple hello world template
    const response = await sendWhatsAppMessage(
      testPhone,
      "hello_world", // Make sure this template exists in your WhatsApp Business Manager
      "en"
    );

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully",
      response
    });
  } catch (error) {
    logger.error('Error sending test WhatsApp message:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test message',
        error: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 