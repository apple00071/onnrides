import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppService } from '@/lib/whatsapp/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const whatsappService = WhatsAppService.getInstance();
    const status = whatsappService.getInitializationStatus();
    
    return NextResponse.json({
      status: status.isInitialized ? 'connected' : 'disconnected',
      error: status.error?.message
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check WhatsApp status' },
      { status: 500 }
    );
  }
} 