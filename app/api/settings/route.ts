import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// GET /api/settings - Get all settings or a specific setting by key
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // If key is provided, get specific setting
    if (key) {
      const setting = await prisma.settings.findUnique({
        where: { key }
      });

      if (!setting) {
        return NextResponse.json({ 
          success: false, 
          error: 'Setting not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: setting 
      });
    }

    // Otherwise, get all settings
    const settings = await prisma.settings.findMany({
      orderBy: { key: 'asc' }
    });

    return NextResponse.json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/settings - Create or update a setting
export async function POST(request: NextRequest) {
  try {
    // Check for admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    // Validate required fields
    if (!key || value === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key and value are required' 
      }, { status: 400 });
    }

    // Create or update the setting
    const setting = await prisma.settings.upsert({
      where: { key },
      update: { 
        value: String(value),
        updated_at: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        key,
        value: String(value),
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    logger.info('Setting updated:', { key, value });

    return NextResponse.json({ 
      success: true, 
      data: setting 
    });
  } catch (error) {
    logger.error('Error updating setting:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update setting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/settings - Delete a setting (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check for admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key parameter is required' 
      }, { status: 400 });
    }

    // Delete the setting
    await prisma.settings.delete({
      where: { key }
    });

    logger.info('Setting deleted:', { key });

    return NextResponse.json({ 
      success: true, 
      message: 'Setting deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting setting:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete setting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 