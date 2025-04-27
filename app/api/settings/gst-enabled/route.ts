import { NextResponse } from 'next/server';
import { getBooleanSetting } from '@/lib/settings';
import { SETTINGS } from '@/lib/settings';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const gstEnabled = await getBooleanSetting(SETTINGS.GST_ENABLED, false);
    
    return NextResponse.json({
      enabled: gstEnabled
    });
  } catch (error) {
    logger.error('Error fetching GST enabled setting:', error);
    return NextResponse.json({
      enabled: false
    });
  }
} 