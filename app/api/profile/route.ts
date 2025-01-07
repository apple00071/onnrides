import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Get user from token instead of headers
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First check if profile exists
    const profileCheck = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );

    // If profile doesn't exist, create one with minimal data
    if (profileCheck.rows.length === 0) {
      const createProfile = await client.query(
        `INSERT INTO profiles (
          user_id, 
          first_name, 
          last_name, 
          phone_number,
          is_documents_verified
        ) VALUES ($1, NULL, NULL, NULL, false)
        RETURNING *`,
        [user.id]
      );
      
      if (createProfile.rows.length === 0) {
        throw new Error('Failed to create profile');
      }
    }

    // Get user data with profile
    const result = await client.query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.updated_at,
        p.first_name,
        p.last_name,
        p.phone_number as phone,
        p.address,
        p.is_documents_verified,
        p.created_at as profile_created_at,
        p.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Combine first_name and last_name for backward compatibility
    const profile = {
      ...result.rows[0],
      name: `${result.rows[0].first_name || ''} ${result.rows[0].last_name || ''}`.trim()
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Get user from token instead of headers
    const user = await getCurrentUser(request.cookies);
    if (!user) {
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

    // First check if profile exists
    const profileCheck = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
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
        [user.id, firstName, lastName, phone]
      );
    }

    const result = await client.query(
      `UPDATE profiles 
       SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone_number = COALESCE($3, phone_number),
        address = COALESCE($4, address),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [firstName, lastName, phone, address, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get full user data with updated profile
    const fullProfile = await client.query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.updated_at,
        p.first_name,
        p.last_name,
        p.phone_number as phone,
        p.address,
        p.is_documents_verified,
        p.created_at as profile_created_at,
        p.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [user.id]
    );

    // Combine first_name and last_name for backward compatibility
    const profile = {
      ...fullProfile.rows[0],
      name: `${fullProfile.rows[0].first_name || ''} ${fullProfile.rows[0].last_name || ''}`.trim()
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 