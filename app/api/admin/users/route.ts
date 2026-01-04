import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

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

    // Calculate pagination
    const offset = (page - 1) * limit;

    // First, check if is_blocked column exists (using shared query)
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_blocked'
      );
    `;
    const columnExistsResult = await query(checkColumnQuery);
    const hasIsBlockedColumn = columnExistsResult.rows[0].exists;

    // Build the SQL query with search conditions if needed
    let sqlQuery = `
      SELECT 
        id::text as id, 
        name, 
        email, 
        phone, 
        role,
        created_at as "createdAt",
        updated_at as "updatedAt",
        ${hasIsBlockedColumn ?
        'CASE WHEN is_blocked IS TRUE THEN TRUE ELSE FALSE END' :
        'FALSE'
      } as is_blocked
      FROM users
      WHERE LOWER(role) != 'admin'
    `;

    const queryParams: any[] = [];

    if (search) {
      sqlQuery += ` AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    // Add order by, limit and offset
    sqlQuery += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Execute the query using shared pool
    const result = await query(sqlQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE LOWER(role) != 'admin'
      ${search ? `AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)` : ''}
    `;

    const countResult = await query(
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
    logger.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 