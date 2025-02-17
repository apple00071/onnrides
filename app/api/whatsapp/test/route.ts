import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';

export async function GET(req: Request) {
    try {
        const testPhone = process.env.TEST_PHONE_NUMBER;
        if (!testPhone) {
            return NextResponse.json(
                {
                    error: 'TEST_PHONE_NUMBER environment variable is not set',
                    success: false
                },
                { status: 400 }
            );
        }

        const whatsapp = WhatsAppService.getInstance();
        
        // Send a test message with current timestamp
        const timestamp = new Date().toLocaleString();
        const result = await whatsapp.sendMessage(
            testPhone,
            `🔔 Onnrides WhatsApp Test Message\n\n` +
            `This is a test message sent at: ${timestamp}\n\n` +
            `Your phone number: ${testPhone}\n` +
            `If you receive this message, the WhatsApp integration is working correctly! 🎉`
        );

        return NextResponse.json({
            success: true,
            message: 'Test message sent successfully',
            timestamp,
            details: {
                messageId: result.messageId,
                logId: result.logId,
                recipient: testPhone,
                apiResponse: result.response
            }
        });
    } catch (error) {
        console.error('WhatsApp Test Error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toLocaleString(),
                details: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : error
            },
            { status: 500 }
        );
    }
} 