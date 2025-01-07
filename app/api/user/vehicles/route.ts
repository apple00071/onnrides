import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Get vehicles owned by the user
      const result = await client.query(`
        SELECT 
          id,
          name,
          type,
          brand,
          model,
          year,
          color,
          registration_number,
          price_per_day,
          is_available,
          image_url,
          created_at
        FROM vehicles
        WHERE owner_id = $1
        ORDER BY created_at DESC
      `, [user.id]);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
} 