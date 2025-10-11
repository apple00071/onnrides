import { NextRequest, NextResponse } from 'next/server';
import { WaSenderService } from '../../../../../lib/whatsapp/wasender-service';

export async function GET(request: NextRequest) {
  try {
    const wasenderService = WaSenderService.getInstance();
    const sessionStatus = await wasenderService.getSessionStatus();

    return NextResponse.json({
      success: true,
      sessionStatus: sessionStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WhatsApp status API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get session status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
