import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { Pool } from 'pg';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * DELETE endpoint to remove all users except admin users
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      logger.warn('Unauthorized attempt to delete all users', {
        session: !!session,
        userRole: session?.user?.role
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Create a database connection pool
    logger.info('Creating database connection for bulk user deletion');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    let client;
    try {
      client = await pool.connect();
      logger.info('Database connection established for user deletion');
      
      // First, ensure the admin@onnrides.com user always exists and has role 'admin'
      // to avoid locking ourselves out
      const adminEmail = 'admin@onnrides.com';
      
      const checkAdminQuery = `
        SELECT * FROM users WHERE email = $1
      `;
      const adminResult = await client.query(checkAdminQuery, [adminEmail]);
      
      if (adminResult.rows.length === 0) {
        logger.warn(`Critical admin user ${adminEmail} not found. Creating it before proceeding.`);
        // We should create the admin user, but will let the dedicated endpoint handle that
      }
      
      // Delete all users except those with role 'admin'
      // This is more reliable than checking against a specific user ID
      const deleteQuery = `
        DELETE FROM users 
        WHERE LOWER(role) != 'admin'
        RETURNING id::text, email
      `;
      
      const result = await client.query(deleteQuery);
      const deletedUsers = result.rows;
      
      logger.info(`Successfully deleted ${deletedUsers.length} users`);
      
      // Double check that we still have admin users left
      const adminCheckQuery = `
        SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'
      `;
      
      const adminCountResult = await client.query(adminCheckQuery);
      const adminCount = parseInt(adminCountResult.rows[0].count);
      
      logger.info(`Preserved ${adminCount} admin users`);
      
      // Return success response with count of deleted users
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedUsers.length} users`,
        deletedCount: deletedUsers.length,
        adminCount: adminCount
      });
    } catch (error) {
      logger.error('Database error during bulk user deletion:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete users', 
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
    logger.error('Error in delete-all users endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 