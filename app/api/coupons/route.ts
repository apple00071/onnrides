import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import prisma from '@/lib/prisma';

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

    const coupons = await prisma.coupons.findMany({
      where: {
        is_active: true,
        end_date: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        code: true,
        discount_type: true,
        discount_value: true,
        description: true,
        end_date: true,
        min_booking_amount: true,
        max_discount_amount: true
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