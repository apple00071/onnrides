import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  formatDateTimeIST, 
  toIST, 
  formatDateIST, 
  formatTimeIST,
  getNowIST,
  getNowISTString
} from '@/lib/utils/timezone';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current date in different formats
    const now = new Date();
    const nowIST = getNowIST();
    
    // Get system timezone
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format dates using different methods
    const testDate = new Date('2023-06-15T14:30:00Z');
    
    return NextResponse.json({
      success: true,
      metadata: {
        serverEnvironment: process.env.NODE_ENV || 'unknown',
        systemTimeZone,
        timestamp: Date.now(),
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
      },
      rawDates: {
        nowUTC: now.toISOString(),
        nowLocal: now.toString(),
        nowIST: nowIST.toISOString(),
      },
      formattedDates: {
        now_formatDateTimeIST: formatDateTimeIST(now),
        nowIST_formatDateTimeIST: formatDateTimeIST(nowIST),
        testDate_formatDateTimeIST: formatDateTimeIST(testDate),
        now_formatDateIST: formatDateIST(now),
        now_formatTimeIST: formatTimeIST(now),
        nowISTString: getNowISTString(),
      }
    });
  } catch (error) {
    logger.error('Timezone test error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform timezone test' },
      { status: 500 }
    );
  }
} 