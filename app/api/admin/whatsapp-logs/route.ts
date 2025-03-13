import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

const ITEMS_PER_PAGE = 20;

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get pagination parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * ITEMS_PER_PAGE;

        // Get total count
        const totalCountResult = await query(
            'SELECT COUNT(*) as count FROM whatsapp_logs'
        );
        const totalItems = parseInt(totalCountResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        // Get logs with pagination and timezone conversion
        const logsResult = await query(`
            WITH log_data AS (
                SELECT 
                    wl.*,
                    wl.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_created_at
                FROM whatsapp_logs wl
            )
            SELECT 
                ld.id,
                ld.recipient,
                ld.message,
                ld.message_id,
                ld.instance_id,
                ld.status,
                ld.error,
                ld.message_type,
                ld.chat_id,
                ld.ist_created_at as created_at,
                ld.metadata,
                COALESCE(v.name, '-') as vehicle_name
            FROM log_data ld
            LEFT JOIN bookings b ON b.booking_id = ld.booking_id
            LEFT JOIN vehicles v ON v.id = b.vehicle_id
            ORDER BY ld.created_at DESC
            LIMIT $1 OFFSET $2`,
            [ITEMS_PER_PAGE, offset]
        );

        return NextResponse.json({
            success: true,
            data: {
                logs: logsResult.rows,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: ITEMS_PER_PAGE
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching WhatsApp logs:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch WhatsApp logs' },
            { status: 500 }
        );
    }
} 