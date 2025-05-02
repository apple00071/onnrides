import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface Setting {
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

const SETTINGS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  GST_ENABLED: 'gst_enabled',
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      const setting = await prisma.settings.findFirst({
        where: { key },
      });
      return NextResponse.json({ success: true, data: setting });
    }

    const settings = await prisma.settings.findMany();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role?.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // First try to find the existing setting
    const existingSetting = await prisma.settings.findFirst({
      where: { key }
    });

    let setting;
    if (existingSetting) {
      // Update existing setting
      setting = await prisma.settings.update({
        where: { id: existingSetting.id },
        data: { value }
      });
    } else {
      // Create new setting with a generated id
      setting = await prisma.settings.create({
        data: {
          id: randomUUID(),
          key,
          value
        }
      });
    }

    logger.info(`Setting ${existingSetting ? 'updated' : 'created'}: ${key} = ${value}`);
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    logger.error('Error updating setting:', error);
    return NextResponse.json({ success: false, error: 'Failed to update setting' }, { status: 500 });
  }
}

// Initialize settings endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role?.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize default settings if they don't exist
    const defaultSettings = [
      { key: SETTINGS.MAINTENANCE_MODE, value: 'false' },
      { key: SETTINGS.GST_ENABLED, value: 'false' },
    ];

    const results = await Promise.all(
      defaultSettings.map(async (setting) => {
        const existing = await prisma.settings.findFirst({
          where: { key: setting.key }
        });

        if (existing) {
          return existing;
        }

        return prisma.settings.create({
          data: {
            id: randomUUID(),
            ...setting
          }
        });
      })
    );

    logger.info('Settings initialized');
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    logger.error('Error initializing settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to initialize settings' }, { status: 500 });
  }
} 