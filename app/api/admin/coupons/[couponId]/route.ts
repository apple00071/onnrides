import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { couponId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { couponId } = params;

    const result = await query('SELECT * FROM coupons WHERE id = $1', [couponId]);
    const coupon = result.rows[0];

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    logger.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { couponId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await request.json();
    const { couponId } = params;

    // Validate required fields
    if (!data.code || !data.discount_type || !data.discount_value) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(data.discount_type)) {
      return NextResponse.json(
        { error: 'Invalid discount type' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (data.discount_type === 'percentage' && (data.discount_value <= 0 || data.discount_value > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check if coupon exists
    const existingResult = await query('SELECT * FROM coupons WHERE id = $1', [couponId]);
    const existingCoupon = existingResult.rows[0];

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (data.code.toUpperCase() !== existingCoupon.code) {
      const codeExistsResult = await query('SELECT id FROM coupons WHERE code = $1', [data.code.toUpperCase()]);
      if (codeExistsResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
    }

    // Update coupon
    const updatedResult = await query(`
      UPDATE coupons SET
        code = $1,
        description = $2,
        discount_type = $3,
        discount_value = $4,
        min_booking_amount = $5,
        max_discount_amount = $6,
        start_date = $7,
        end_date = $8,
        usage_limit = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      data.code.toUpperCase(),
      data.description,
      data.discount_type,
      data.discount_value,
      data.min_booking_amount,
      data.max_discount_amount,
      data.start_date,
      data.end_date,
      data.usage_limit,
      data.is_active,
      couponId
    ]);

    return NextResponse.json({ coupon: updatedResult.rows[0] });
  } catch (error) {
    logger.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { couponId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { couponId } = params;

    // Check if coupon exists
    const existingResult = await query('SELECT id FROM coupons WHERE id = $1', [couponId]);
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Delete coupon
    await query('DELETE FROM coupons WHERE id = $1', [couponId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}