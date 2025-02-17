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

        // Get logs with pagination
        const logsResult = await query(
            `SELECT 
                wl.id,
                wl.recipient,
                wl.message,
                wl.booking_id,
                wl.status,
                wl.error,
                wl.message_type,
                wl.chat_id,
                wl.created_at,
                COALESCE(v.name, '-') as vehicle_name
            FROM whatsapp_logs wl
            LEFT JOIN bookings b ON wl.booking_id = b.booking_id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            ORDER BY wl.created_at DESC
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