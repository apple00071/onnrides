import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import logger from '@/lib/logger';

// POST /api/admin/setup - Create initial admin account
export async function POST(request: NextRequest) {
  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin account already exists' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin account
    const [admin] = await db
      .insert(users)
      .values({
        email,
        password_hash: hashedPassword,
        name,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    logger.error('Failed to setup admin account:', error);
    return NextResponse.json(
      { error: 'Failed to setup admin account' },
      { status: 500 }
    );
  }
} 