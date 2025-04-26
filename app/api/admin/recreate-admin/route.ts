import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * POST endpoint to recreate admin user
 */
export async function POST(req: NextRequest) {
  try {
    logger.info('Attempting to recreate admin user');
    
    // Create a database connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    let client;
    try {
      client = await pool.connect();
      logger.info('Database connection established for admin recreation');
      
      // Check if admin user exists
      const checkQuery = `
        SELECT * FROM users 
        WHERE email = $1
      `;
      
      const checkResult = await client.query(checkQuery, ['admin@onnrides.com']);
      
      if (checkResult.rows.length > 0) {
        logger.info('Admin user already exists, updating password');
        
        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin@123', saltRounds);
        
        // Update the admin user
        const updateQuery = `
          UPDATE users
          SET 
            password_hash = $1,
            role = 'admin',
            is_blocked = false,
            updated_at = NOW()
          WHERE email = $2
          RETURNING id::text, email, role
        `;
        
        const updateResult = await client.query(updateQuery, [hashedPassword, 'admin@onnrides.com']);
        logger.info('Admin user updated successfully', { adminId: updateResult.rows[0]?.id });
        
        return NextResponse.json({
          success: true,
          message: 'Admin user updated successfully',
          admin: updateResult.rows[0]
        });
      }
      
      // Admin user doesn't exist, create it
      logger.info('Admin user does not exist, creating new admin user');
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('admin@123', saltRounds);
      
      // Create the admin user
      const createQuery = `
        INSERT INTO users (
          id, 
          email, 
          name, 
          password_hash, 
          role, 
          is_blocked, 
          created_at, 
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
        RETURNING id::text, email, role
      `;
      
      const adminId = randomUUID();
      const params = [
        adminId,
        'admin@onnrides.com',
        'Admin User',
        hashedPassword,
        'admin',
        false
      ];
      
      const createResult = await client.query(createQuery, params);
      logger.info('Admin user created successfully', { adminId: createResult.rows[0]?.id });
      
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        admin: createResult.rows[0]
      });
    } catch (error) {
      logger.error('Database error during admin user recreation:', error);
      return NextResponse.json(
        { 
          error: 'Failed to recreate admin user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    } finally {
      if (client) {
        client.release();
      }
      await pool.end();
    }
  } catch (error) {
    logger.error('Error in recreate-admin endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 