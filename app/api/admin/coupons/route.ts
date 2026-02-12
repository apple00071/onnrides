import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { DiscountType } from '@/lib/schema';

const DISCOUNT_TYPES: DiscountType[] = ['percentage', 'fixed'];

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all coupons from database
    const result = await query(`
      SELECT * FROM coupons 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ success: true, coupons: result.rows });
  } catch (error) {
    logger.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.code || !data.discount_value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount_type
    const discountType = data.discount_type || 'percentage';
    if (!DISCOUNT_TYPES.includes(discountType)) {
      return NextResponse.json(
        { success: false, error: `Invalid discount_type. Must be one of: ${DISCOUNT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert new coupon into database
    const result = await query(`
      INSERT INTO coupons (
        code, 
        discount_value, 
        discount_type, 
        description,
        min_booking_amount,
        max_discount_amount,
        start_date,
        end_date,
        usage_limit,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      data.code,
      data.discount_value,
      discountType,
      data.description || null,
      data.min_booking_amount || null,
      data.max_discount_amount || null,
      data.start_date || null,
      data.end_date || null,
      data.usage_limit || null,
      data.is_active ?? true
    ]);

    return NextResponse.json({ success: true, coupon: result.rows[0] });
  } catch (error) {
    logger.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 }
    );
  }
} 