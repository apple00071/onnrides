import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

// POST /api/admin/setup - Create initial admin account
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check if admin user already exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `;

    if (existingAdmin.length > 0) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    await sql`
      INSERT INTO users (
        email,
        password_hash,
        name,
        role,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${email},
        ${hashedPassword},
        ${name},
        'admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    logger.info('Admin user created successfully');

    return NextResponse.json({
      message: 'Admin user created successfully'
    });

  } catch (error) {
    logger.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
} 