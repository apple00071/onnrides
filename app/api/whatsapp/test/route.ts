import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';

export async function GET(req: Request) {
    try {
        const whatsapp = WhatsAppService.getInstance();
        
        // Send a test message
        const result = await whatsapp.sendMessage(
            process.env.TEST_PHONE_NUMBER || '',  // Add your test phone number to env variables
            'Test message from Onnrides WhatsApp Service'
        );

        return NextResponse.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('WhatsApp Test Error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false 
            },
            { status: 500 }
        );
    }
} 