import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        active: true,
        expiryDate: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        description: true,
        expiryDate: true,
        minBookingAmount: true,
        maxDiscountAmount: true
      }
    });

    return NextResponse.json(coupons);
  } catch (error) {
    logger.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
} 