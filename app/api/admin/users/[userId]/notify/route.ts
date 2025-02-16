import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import WebSocketService from '@/lib/websocket/service';
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

    // Send notification through WebSocket
    const wsService = WebSocketService.getInstance();
    wsService.notifyUserStatus(params.userId, action);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error notifying user:', error);
    return NextResponse.json(
      { error: 'Failed to notify user' },
      { status: 500 }
    );
  }
} 