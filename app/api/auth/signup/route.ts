import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import logger from '@/lib/logger';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Define Zod schema for user signup
const userSignupSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional()
});

// Define type for signup data based on the Zod schema
type UserSignupData = z.infer<typeof userSignupSchema>;

// Add debug logging function
async function debugLog(message: string, data: any = {}) {
  const logMessage = `[SIGNUP DEBUG] ${message}: ${JSON.stringify(data, null, 2)}`;
  logger.info(logMessage);
  
  // Also log to a file for easier debugging
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'signup-debug.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} - ${logMessage}\n`);
  } catch (error: unknown) {
    console.error("Database error during signup:", error);
    // Check for type mismatch errors
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "42804" || 
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.includes("type mismatch")) {
      return NextResponse.json({ error: "Type mismatch in database operation" }, { status: 500 });
    }
    // Ignore file writing errors
  }
  
  return message;
}

export async function POST(req: NextRequest) {
  // Initialize PostgreSQL client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    await debugLog('Connected to PostgreSQL database', { 
      dbUrl: process.env.DATABASE_URL ? '(set)' : '(not set)'
    });
    
    // Parse the request body
    const rawBody = await req.json();
    
    // Validate and type the body with Zod
    let body: UserSignupData;
    
    try {
      body = userSignupSchema.parse(rawBody);
      
      await debugLog('Signup request received', { 
        email: body.email,
        name: body.name,
        phone: body.phone,
        passwordLength: body.password?.length
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        await debugLog('Signup validation failed', { 
          errors: validationError.errors 
        });
        return NextResponse.json(
          { error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      await debugLog('Transaction started');
      
      // Check if user already exists
      await debugLog('Checking if user already exists', { email: body.email });
      
      const existingUserResult = await client.query(
        'SELECT email FROM users WHERE email = $1 LIMIT 1',
        [body.email]
      );
      
      if (existingUserResult.rowCount && existingUserResult.rowCount > 0) {
        await debugLog('Signup attempt with existing email', { email: body.email });
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(body.password, 10);
      
      // Insert the new user into the database
      const result = await client.query(
        `INSERT INTO users (
          id,
          name, 
          email, 
          password_hash, 
          phone, 
          role,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id::text, name, email, phone, role`,
        [
          randomUUID(), // Generate UUID for id
          body.name || null,
          body.email,
          hashedPassword,
          body.phone || null,
          'user',
          new Date(),
          new Date()
        ]
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      await debugLog('Transaction committed');
      
      // Extract user from result
      const user = result.rows[0];
      
      await debugLog('User created successfully', { 
        id: user.id,
        email: user.email
      });
      
      // Get current users from database for debugging
      const allUsersResult = await client.query(
        `SELECT COUNT(*) as count FROM users`
      );
      
      await debugLog('Current users count in database', { 
        count: allUsersResult.rows[0].count
      });
      
      // Return the new user data
      return NextResponse.json({
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }, { status: 201 });
    } catch (dbError: unknown) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      
      await debugLog('Database error during signup:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        email: body.email
      });
      
      return NextResponse.json(
        { error: 'Database error during signup', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Database error during signup:", error);
    // Check for type mismatch errors
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "42804" || 
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.includes("type mismatch")) {
      return NextResponse.json({ error: "Type mismatch in database operation" }, { status: 500 });
    }
    await debugLog('Signup error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  } finally {
    // Close the PostgreSQL client connection
    await client.end().catch(e => logger.error('Error closing database connection:', e));
    await debugLog('Closed PostgreSQL connection');
  }
} 