import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

const ITEMS_PER_PAGE = 20;

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

        // Create whatsapp_logs table if it doesn't exist
        await query(`
            CREATE TABLE IF NOT EXISTS whatsapp_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                recipient TEXT NOT NULL,
                message TEXT NOT NULL,
                booking_id TEXT,
                status TEXT NOT NULL,
                error TEXT,
                message_id TEXT,
                template_name TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes if they don't exist
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_logs_status') THEN
                    CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_logs_recipient') THEN
                    CREATE INDEX idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_logs_booking_id') THEN
                    CREATE INDEX idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_logs_created_at') THEN
                    CREATE INDEX idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);
                END IF;
            END $$;

            -- Create trigger for updated_at if it doesn't exist
            CREATE OR REPLACE FUNCTION update_whatsapp_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_whatsapp_logs_updated_at ON whatsapp_logs;
            CREATE TRIGGER update_whatsapp_logs_updated_at
                BEFORE UPDATE ON whatsapp_logs
                FOR EACH ROW
                EXECUTE FUNCTION update_whatsapp_updated_at_column();
        `);

        // Get query parameters
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await query('SELECT COUNT(*) as count FROM whatsapp_logs');
        const totalCount = parseInt(countResult.rows[0].count);

        // Get WhatsApp logs with pagination
        const sqlQuery = `
            WITH whatsapp_data AS (
                SELECT 
                    wl.*,
                    wl.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_created_at
                FROM whatsapp_logs wl
            )
            SELECT 
                wd.id,
                wd.recipient,
                wd.message,
                wd.booking_id,
                wd.status,
                wd.error,
                wd.message_id,
                wd.template_name,
                wd.ist_created_at,
                v.name as vehicle_name 
            FROM whatsapp_data wd
            LEFT JOIN bookings b ON b.id::text = wd.booking_id
            LEFT JOIN vehicles v ON v.id = b.vehicle_id 
            ORDER BY wd.created_at DESC 
            LIMIT $1 OFFSET $2
        `;
        
        logger.debug('Executing WhatsApp logs query', { query: sqlQuery });
        
        const result = await query(sqlQuery, [limit, offset]);

        // Format the response data
        const formattedData = result.rows.map((row: {
            id: string;
            recipient: string;
            message: string;
            booking_id: string | null;
            status: string;
            error: string | null;
            message_id: string | null;
            template_name: string | null;
            ist_created_at: string;
            vehicle_name: string | null;
        }) => ({
            ...row,
            created_at: row.ist_created_at,
            ist_created_at: undefined // Remove the extra field
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
        logger.error('Error fetching WhatsApp logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch WhatsApp logs' },
            { status: 500 }
        );
    }
} 