import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();

    return NextResponse.json({
      maintenance: setting?.value === 'true'
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return NextResponse.json({
      maintenance: false
    });
  }
} 