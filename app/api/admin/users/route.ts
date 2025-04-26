import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { Pool } from 'pg';

// Simple API endpoint to get users data for admin panel
export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
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
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Create a database connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    try {
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
      logger.info('Executing direct SQL query for users:', { query, params: queryParams });
      const result = await pool.query(query, queryParams);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        ${search ? `WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1` : ''}
      `;
      
      const countResult = await pool.query(
        countQuery, 
        search ? [`%${search}%`] : []
      );
      
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);
      
      // Return the results
      return NextResponse.json({
        users: result.rows,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        }
      });
    } catch (error) {
      logger.error('Database error in users API:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    } finally {
      // Always release the pool
      await pool.end();
    }
  } catch (error) {
    logger.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 