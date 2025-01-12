import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    client = await pool.connect();

    // Get user profile data
    const result = await client.query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        up.name,
        up.phone,
        up.address,
        up.is_documents_verified,
        up.documents_submitted,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PATCH(request: NextRequest) {
  let client;
  
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, phone, address } = await request.json();

    // Split name into first_name and last_name if provided
    let firstName = null;
    let lastName = null;
    if (name) {
      const [firstPart, ...lastParts] = name.trim().split(' ');
      firstName = firstPart;
      lastName = lastParts.join(' ') || null;
    }

    client = await pool.connect();

    // First check if profile exists
    const profileCheck = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [session.user.id]
    );

    // If profile doesn't exist, create one
    if (profileCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO profiles (
          user_id, 
          first_name, 
          last_name, 
          phone_number,
          is_documents_verified
        ) VALUES ($1, $2, $3, $4, false)`,
        [session.user.id, firstName, lastName, phone]
      );
    }

    // Update the profile
    const result = await client.query(
      `UPDATE profiles 
       SET first_name = $1, 
           last_name = $2, 
           phone_number = $3,
           address = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [firstName, lastName, phone, address, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get full user data with updated profile
    const profile = {
      ...result.rows[0],
      name: `${result.rows[0].first_name} ${result.rows[0].last_name || ''}`.trim(),
      email: session.user.email
    };

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
} 