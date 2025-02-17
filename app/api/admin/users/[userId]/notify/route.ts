import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { action } = await request.json();
    if (!action || !['blocked', 'deleted'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get user's phone number
    const userResult = await query(
      'SELECT phone FROM users WHERE id = $1',
      [params.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userPhone = userResult.rows[0].phone;

    // Send WhatsApp notification
    const whatsapp = WhatsAppService.getInstance();
    const result = await whatsapp.sendMessage(userPhone, action);

    logger.info(`Notification sent to user ${params.userId}`, { messageId: result.messageId });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      details: {
        userId: params.userId,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to send notification',
        success: false 
      },
      { status: 500 }
    );
  }
} 