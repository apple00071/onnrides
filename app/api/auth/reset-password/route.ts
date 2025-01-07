import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Find user with valid reset token
      const result = await client.query(
        `SELECT id 
         FROM users 
         WHERE reset_token = $1 
         AND reset_token_expiry > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and clear reset token
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             reset_token = NULL, 
             reset_token_expiry = NULL 
         WHERE id = $2`,
        [hashedPassword, result.rows[0].id]
      );

      return NextResponse.json({
        message: 'Password reset successful'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 