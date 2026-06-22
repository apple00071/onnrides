import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Check if the current provider is configured
    const provider = process.env.WHATSAPP_PROVIDER || (process.env.OPENWA_API_KEY ? 'openwa' : 'wasender');
    let isConfigured = false;
    let errorMsg = undefined;

    if (provider === 'openwa') {
      isConfigured = !!process.env.OPENWA_API_KEY;
      errorMsg = isConfigured ? undefined : 'OpenWA API Key missing';
    } else {
      isConfigured = !!process.env.WASENDER_API_KEY;
      errorMsg = isConfigured ? undefined : 'WaSender API Key missing';
    }

    return NextResponse.json({
      status: isConfigured ? 'connected' : 'disconnected',
      provider: provider,
      error: errorMsg
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check WaSender status' },
      { status: 500 }
    );
  }
}
