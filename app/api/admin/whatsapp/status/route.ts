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

    // WaSender is stateless, so we assume it's connected if env vars are present
    const isConfigured = !!process.env.WASENDER_API_KEY;

    return NextResponse.json({
      status: isConfigured ? 'connected' : 'disconnected',
      error: isConfigured ? undefined : 'WaSender API Key missing'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check WaSender status' },
      { status: 500 }
    );
  }
}