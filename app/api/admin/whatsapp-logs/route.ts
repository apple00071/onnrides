import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { sql } from 'kysely';
import type { WhatsAppLog } from '@/lib/schema';

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
        const totalCount = await db
            .selectFrom('whatsapp_logs')
            .select(sql<number>`count(*)`.as('count'))
            .executeTakeFirst();

        const totalItems = Number(totalCount?.count || 0);
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        // Get logs with pagination
        const logs = await db
            .selectFrom('whatsapp_logs as wl')
            .leftJoin('bookings as b', 'wl.booking_id', 'b.id')
            .leftJoin('vehicles as v', 'b.vehicle_id', 'v.id')
            .select([
                'wl.id',
                'wl.recipient',
                'wl.message',
                'wl.booking_id',
                'wl.status',
                'wl.error',
                'wl.message_type',
                'wl.chat_id',
                'wl.created_at',
                'v.name as vehicle_name'
            ])
            .orderBy('wl.created_at', 'desc')
            .limit(ITEMS_PER_PAGE)
            .offset(offset)
            .execute();

        return NextResponse.json({
            success: true,
            data: {
                logs,
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