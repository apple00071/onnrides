import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized access attempt to user profile');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Get user profile data
      const result = await client.query(`
        SELECT 
          u.id,
          u.email,
          u.role,
          u.created_at,
          p.first_name,
          p.last_name,
          p.phone_number,
          p.address,
          p.is_blocked
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = result.rows[0];
      console.log('User profile data:', user);

      return NextResponse.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        created_at: user.created_at,
        is_blocked: user.is_blocked || false
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 