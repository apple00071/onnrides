import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await query(`
      SELECT 
        id,
        code,
        discount_type,
        discount_value,
        description,
        end_date,
        min_booking_amount,
        max_discount_amount
      FROM coupons
      WHERE is_active = true
      AND end_date >= NOW()
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}