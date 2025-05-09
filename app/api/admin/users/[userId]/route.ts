import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import { Pool } from 'pg';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Get individual user details
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      logger.warn('Unauthorized attempt to access admin user details API', {
        session: !!session,
        userRole: session?.user?.role,
        userId: params.userId
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    logger.info('Admin user details API request', {
      userId: params.userId
    });
    
    // Get query parameters
    const url = new URL(req.url);
    const include = url.searchParams.get('include')?.split(',') || [];
    const includeBookings = include.includes('bookings');
    const includeTripData = include.includes('tripData');
    
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
      logger.info('Database connection established successfully');

      // First, check if is_blocked column exists
      const checkColumnQuery = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name = 'is_blocked'
        );
      `;
      const columnExists = await client.query(checkColumnQuery);
      const hasIsBlockedColumn = columnExists.rows[0].exists;

      // Get user details
      const userQuery = `
        SELECT 
          u.id::text as id, 
          u.name, 
          u.email, 
          u.phone,
          u.created_at as "createdAt",
          u.updated_at as "updatedAt",
          ${hasIsBlockedColumn ? 
            'CASE WHEN u.is_blocked IS TRUE THEN TRUE ELSE FALSE END' : 
            'FALSE'
          } as is_blocked
        FROM users u
        WHERE u.id = $1
      `;
      
      const userResult = await client.query(userQuery, [params.userId]);
      
      if (userResult.rows.length === 0) {
        logger.warn('User not found', { userId: params.userId });
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];

      // Check if documents table exists
      const checkDocumentsTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'documents'
        );
      `;
      const documentsTableExists = await client.query(checkDocumentsTableQuery);
      
      // Only query documents if the table exists
      if (documentsTableExists.rows[0].exists) {
        const documentsQuery = `
          SELECT 
            id::text,
            type,
            file_url,
            status,
            rejection_reason,
            created_at,
            updated_at
          FROM documents
          WHERE user_id = $1
          ORDER BY created_at DESC
        `;
        
        const documentsResult = await client.query(documentsQuery, [params.userId]);
        user.documents = documentsResult.rows;
      } else {
        user.documents = [];
      }

      // Get bookings if requested
      if (includeBookings) {
        const bookingsQuery = `
          SELECT 
            b.id,
            b.booking_id,
            b.start_date,
            b.end_date,
            b.total_price,
            b.status,
            b.payment_status,
            b.created_at,
            v.name as vehicle_name,
            v.type as vehicle_type
          FROM bookings b
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
        `;
        
        const bookingsResult = await client.query(bookingsQuery, [params.userId]);
        user.bookings = bookingsResult.rows.map(booking => ({
          id: booking.id,
          booking_id: booking.booking_id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_price: booking.total_price,
          status: booking.status,
          payment_status: booking.payment_status,
          created_at: booking.created_at,
          vehicle: {
            name: booking.vehicle_name,
            type: booking.vehicle_type
          }
        }));
      }

      // Get trip statistics if requested
      if (includeTripData) {
        const tripDataQuery = `
          SELECT 
            COUNT(*) as total_trips,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent,
            (
              SELECT v.type
              FROM bookings b2
              JOIN vehicles v ON b2.vehicle_id = v.id
              WHERE b2.user_id = $1 AND b2.status = 'completed'
              GROUP BY v.type
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) as favorite_vehicle_type
          FROM bookings
          WHERE user_id = $1
        `;
        
        const tripDataResult = await client.query(tripDataQuery, [params.userId]);
        user.trip_data = {
          total_trips: parseInt(tripDataResult.rows[0].total_trips),
          completed_trips: parseInt(tripDataResult.rows[0].completed_trips),
          cancelled_trips: parseInt(tripDataResult.rows[0].cancelled_trips),
          total_spent: parseFloat(tripDataResult.rows[0].total_spent),
          favorite_vehicle_type: tripDataResult.rows[0].favorite_vehicle_type
        };
      }

      logger.info('User details retrieved successfully', {
        userId: params.userId,
        email: user.email,
        includeBookings,
        includeTripData
      });
      
      return NextResponse.json(user);
    } catch (error) {
      logger.error('Database error in user details API:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user details', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      if (client) {
        logger.info('Releasing database client');
        client.release();
      }
      await pool.end();
    }
  } catch (error) {
    logger.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Toggle user block status
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      logger.warn('Unauthorized attempt to toggle user block status', {
        session: !!session,
        userRole: session?.user?.role,
        userId: params.userId
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    let client;
    try {
      client = await pool.connect();
      
      // First, check if is_blocked column exists
      const checkColumnQuery = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name = 'is_blocked'
        );
      `;
      const columnExists = await client.query(checkColumnQuery);
      const hasIsBlockedColumn = columnExists.rows[0].exists;

      if (!hasIsBlockedColumn) {
        // Add is_blocked column if it doesn't exist
        await client.query(`
          ALTER TABLE users
          ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE
        `);
      }

      // Toggle the is_blocked status
      const query = `
        UPDATE users
        SET is_blocked = NOT COALESCE(is_blocked, FALSE)
        WHERE id = $1
        RETURNING 
          id::text as id,
          name,
          email,
          phone,
          role,
          created_at as "createdAt",
          updated_at as "updatedAt",
          is_blocked
      `;
      
      const result = await client.query(query, [params.userId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
      logger.error('Database error in toggle block status:', error);
      return NextResponse.json(
        { error: 'Failed to update user status', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      if (client) {
        client.release();
      }
      await pool.end();
    }
  } catch (error) {
    logger.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { status } = await request.json();
    
    const result = await query(
      'UPDATE users SET status = $1::uuid, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid RETURNING *',
      [status, params.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1::uuid RETURNING *',
      [params.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 