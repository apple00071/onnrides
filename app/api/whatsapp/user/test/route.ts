import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(req: Request) {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                {
                    error: 'Authentication required',
                    success: false
                },
                { status: 401 }
            );
        }

        // Get user's phone number from database
        const userResult = await query(
            'SELECT phone FROM users WHERE id = $1',
            [session.user.id]
        );

        if (!userResult.rows[0]?.phone) {
            return NextResponse.json(
                {
                    error: 'No phone number found for user',
                    success: false
                },
                { status: 400 }
            );
        }

        const userPhone = userResult.rows[0].phone;
        const whatsapp = WhatsAppService.getInstance();
        
        // Send a test message with current timestamp
        const timestamp = new Date().toLocaleString();
        const result = await whatsapp.sendMessage(
            userPhone,
            `🔔 Onnrides User Test Message\n\n` +
            `Hello ${session.user.name || 'User'}!\n\n` +
            `This is a test message sent at: ${timestamp}\n\n` +
            `Your phone number: ${userPhone}\n` +
            `If you receive this message, your WhatsApp notifications are working correctly! 🎉`
        );

        return NextResponse.json({
            success: true,
            message: 'Test message sent successfully',
            timestamp,
            details: {
                messageId: result.messageId,
                logId: result.logId,
                recipient: userPhone,
                apiResponse: result.response
            }
        });
    } catch (error) {
        logger.error('WhatsApp User Test Error:', error);
        
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