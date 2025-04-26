import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Client } from 'pg';
import logger from '@/lib/logger';

// Define login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = loginSchema.parse(body);
    
    // Create a direct database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    
    try {
      // Find the user by email
      const userResult = await client.query(
        'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
        [body.email]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn('Login failed: User not found', { email: body.email });
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      const user = userResult.rows[0];
      
      // Verify password
      const passwordMatch = await bcrypt.compare(
        validatedData.password,
        user.password_hash
      );
      
      if (!passwordMatch) {
        logger.warn('Login failed: Invalid password', { email: body.email });
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // Ensure user ID is converted to string for consistency
      const userId = user.id.toString();
      
      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );
      
      logger.info('User logged in successfully', { 
        userId, 
        email: user.email,
        role: user.role 
      });
      
      // Return user and token
      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: userId,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    } finally {
      // Always close the connection
      await client.end();
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 