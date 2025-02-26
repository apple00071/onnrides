import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { couponId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const coupon = await prisma.coupons.findUnique({
      where: { id: params.couponId }
    });

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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await request.json();

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
    const existingCoupon = await prisma.coupons.findUnique({
      where: { id: params.couponId },
    });

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (data.code !== existingCoupon.code) {
      const codeExists = await prisma.coupons.findUnique({
        where: { code: data.code.toUpperCase() },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
    }

    // Update coupon
    const coupon = await prisma.coupons.update({
      where: { id: params.couponId },
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_booking_amount: data.min_booking_amount,
        max_discount_amount: data.max_discount_amount,
        start_date: data.start_date,
        end_date: data.end_date,
        usage_limit: data.usage_limit,
        is_active: data.is_active,
      },
    });

    return NextResponse.json({ coupon });
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if coupon exists
    const existingCoupon = await prisma.coupons.findUnique({
      where: { id: params.couponId },
    });

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Delete coupon
    await prisma.coupons.delete({
      where: { id: params.couponId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
} 