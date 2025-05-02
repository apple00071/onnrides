import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface Setting {
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // If a specific key is requested
    if (key) {
      const setting = await prisma.$queryRaw`
        SELECT * FROM settings WHERE key = ${key}
      `;

      if (!setting || !Array.isArray(setting) || setting.length === 0) {
        return NextResponse.json(
          { error: `Setting '${key}' not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        [key]: setting[0].value
      });
    }

    // Otherwise return all settings
    const settings = await prisma.$queryRaw`
      SELECT * FROM settings
    `;

    if (!Array.isArray(settings)) {
      throw new Error('Invalid response from database');
    }

    const settingsMap = settings.reduce<Record<string, string>>((acc, setting: Setting) => ({
      ...acc,
      [setting.key]: setting.value
    }), {});

    return NextResponse.json(settingsMap);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use raw query for upsert since the model is not recognized
    await prisma.$executeRaw`
      INSERT INTO settings (key, value, created_at, updated_at)
      VALUES (${key}, ${String(value)}, NOW(), NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = ${String(value)}, updated_at = NOW()
    `;

    const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${key}
    `;

    return NextResponse.json(Array.isArray(setting) ? setting[0] : setting);
  } catch (error) {
    logger.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
} 