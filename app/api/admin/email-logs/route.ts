import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create email_logs table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        "messageContent" TEXT NOT NULL,
        "bookingId" TEXT,
        status TEXT NOT NULL,
        error TEXT,
        "messageId" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes if they don't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_status') THEN
          CREATE INDEX idx_email_logs_status ON email_logs(status);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_recipient') THEN
          CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_booking_id') THEN
          CREATE INDEX idx_email_logs_booking_id ON email_logs("bookingId");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_created_at') THEN
          CREATE INDEX idx_email_logs_created_at ON email_logs("createdAt");
        END IF;
      END $$;

      -- Create trigger for updated_at if it doesn't exist
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
      CREATE TRIGGER update_email_logs_updated_at
          BEFORE UPDATE ON email_logs
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM email_logs');
    const totalCount = parseInt(countResult.rows[0].count);
    
    logger.debug('Checking bookings table structure');
    // Check for the existence of bookingId column in the bookings table
    const checkBookingIdColumnResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
        AND column_name = 'bookingId'
    `);
    
    const hasBookingIdColumn = checkBookingIdColumnResult.rows.length > 0;
    logger.debug('Bookings table structure check result', { 
      hasBookingIdColumn, 
      columns: checkBookingIdColumnResult.rows 
    });

    // Get email logs with pagination - modify the join based on the bookings table structure
    const sqlQuery = `
      WITH email_data AS (
        SELECT 
          el.*,
          el."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_created_at
        FROM email_logs el
      )
      SELECT 
        ed.id,
        ed.recipient,
        ed.subject,
        ed."messageContent",
        ed."bookingId",
        ed.status,
        ed.error,
        ed."messageId",
        ed.ist_created_at,
        v.name as vehicle_name 
      FROM email_data ed
      LEFT JOIN bookings b ON ${hasBookingIdColumn ? 
        'b."bookingId" = ed."bookingId"' : 
        'b.id::text = ed."bookingId"'
      }
      LEFT JOIN vehicles v ON v.id = b."vehicleId" 
      ORDER BY ed."createdAt" DESC 
      LIMIT $1 OFFSET $2
    `;
    
    logger.debug('Executing email logs query', { query: sqlQuery });
    
    const result = await query(sqlQuery, [limit, offset]);

    // Format the response data
    const formattedData = result.rows.map((row: {
      id: string;
      recipient: string;
      subject: string;
      messageContent: string;
      bookingId: string | null;
      status: string;
      error: string | null;
      messageId: string | null;
      ist_created_at: string;
      vehicle_name: string | null;
    }) => ({
      id: row.id,
      recipient: row.recipient,
      subject: row.subject,
      messageContent: row.messageContent,
      bookingId: row.bookingId,
      status: row.status,
      error: row.error,
      messageId: row.messageId,
      createdAt: row.ist_created_at,
      vehicleName: row.vehicle_name
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch email logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
} 