import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { DiscountType } from '@/lib/schema';
import { Prisma } from '@prisma/client';

const DISCOUNT_TYPES: DiscountType[] = ['percentage', 'fixed'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const coupons = await prisma.coupons.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    logger.error('Error fetching coupons:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    if (!DISCOUNT_TYPES.includes(data.discount_type)) {
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

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupons.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    try {
      // Create coupon
      const coupon = await prisma.coupons.create({
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
          is_active: data.is_active ?? true,
          times_used: 0,
        },
      });

      return NextResponse.json({ coupon });
    } catch (dbError) {
      logger.error('Database error creating coupon:', dbError);
      
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (dbError.code === 'P2002') {
          return NextResponse.json(
            { error: 'Coupon code already exists' },
            { status: 400 }
          );
        }
      }
      
      throw dbError; // Re-throw for general error handling
    }
  } catch (error) {
    logger.error('Error creating coupon:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
} 