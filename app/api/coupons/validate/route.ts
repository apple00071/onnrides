import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code, totalAmount } = await request.json();

        if (!code) {
            return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
        }

        // Fetch the coupon from the database
        const result = await query(
            'SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true',
            [code.toUpperCase()]
        );

        const coupon = result.rows[0];

        if (!coupon) {
            return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
        }

        // Check expiry
        const now = new Date();
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
        }

        // Check start date
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return NextResponse.json({ error: 'Coupon is not yet active' }, { status: 400 });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
            return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
        }

        // Check minimum booking amount
        if (coupon.min_booking_amount && totalAmount < Number(coupon.min_booking_amount)) {
            return NextResponse.json({
                error: `Minimum booking amount for this coupon is ₹${coupon.min_booking_amount}`
            }, { status: 400 });
        }

        // Calculate possible discount (for informational purposes - server will re-calculate on booking)
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = Math.round(totalAmount * (Number(coupon.discount_value) / 100));
            if (coupon.max_discount_amount && discountAmount > Number(coupon.max_discount_amount)) {
                discountAmount = Number(coupon.max_discount_amount);
            }
        } else {
            discountAmount = Number(coupon.discount_value);
        }

        return NextResponse.json({
            success: true,
            coupon: {
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: Number(coupon.discount_value),
                max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
                discountAmount
            }
        });

    } catch (error) {
        logger.error('Error validating coupon:', error);
        return NextResponse.json(
            { error: 'Failed to validate coupon' },
            { status: 500 }
        );
    }
}
