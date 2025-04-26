import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { Pool } from 'pg';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Simple API endpoint to get users data for admin panel
export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      logger.warn('Unauthorized attempt to access admin users API', {
        session: !!session,
        userRole: session?.user?.role
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    logger.info('Admin users API request parameters', {
      page,
      limit,
      search: search || 'none',
      url: req.url
    });
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Create a database connection pool
    logger.info('Creating database connection pool with DATABASE_URL', {
      dbUrlDefined: !!process.env.DATABASE_URL,
      dbUrlLength: process.env.DATABASE_URL?.length || 0
    });
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    let client;
    try {
      logger.info('Connecting to database...');
      client = await pool.connect();
      logger.info('Database connection established successfully');
      
      // Build the SQL query with search conditions if needed
      let query = `
        SELECT 
          id::text as id, 
          name, 
          email, 
          phone, 
          role,
          created_at,
          updated_at,
          CASE WHEN is_blocked IS TRUE THEN TRUE ELSE FALSE END as is_blocked
        FROM users
      `;
      
      const queryParams = [];
      
      if (search) {
        query += ` WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
        queryParams.push(`%${search}%`);
      }
      
      // Add order by, limit and offset
      query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, skip);
      
      // Execute the query
      logger.info('Executing users query', { 
        query,
        params: queryParams,
        limit,
        offset: skip
      });
      
      const result = await client.query(query, queryParams);
      logger.info('Users query result', { 
        rowCount: result.rowCount,
        firstUserId: result.rows[0]?.id || 'no users found',
        firstUserEmail: result.rows[0]?.email || 'no users found'
      });
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        ${search ? `WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1` : ''}
      `;
      
      logger.info('Executing count query', { countQuery });
      const countResult = await client.query(
        countQuery, 
        search ? [`%${search}%`] : []
      );
      
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);
      
      logger.info('Pagination info', { totalCount, totalPages, currentPage: page });
      
      // Return the results
      const response = {
        users: result.rows,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        }
      };
      
      logger.info('Returning users API response', {
        userCount: result.rows.length,
        totalUsers: totalCount
      });
      
      return NextResponse.json(response);
    } catch (error) {
      logger.error('Database error in users API:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      // Release the client back to the pool
      if (client) {
        logger.info('Releasing database client');
        client.release();
      }
      // Close the pool
      logger.info('Closing database pool');
      await pool.end();
    }
  } catch (error) {
    logger.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 