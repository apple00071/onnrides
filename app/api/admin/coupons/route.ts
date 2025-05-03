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

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.code || !data.discount || !data.max_uses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new coupon into database
    const result = await query(`
      INSERT INTO coupons (code, discount, max_uses, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [data.code, data.discount, data.max_uses, data.description || null]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 }
    );
  }
} 