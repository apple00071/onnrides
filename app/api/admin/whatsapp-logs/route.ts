import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

const ITEMS_PER_PAGE = 20;

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
        const countResult = await query('SELECT COUNT(*) FROM whatsapp_logs');
        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        // Get logs with pagination
        const result = await query(
            `SELECT wl.*, b.vehicle_id 
             FROM whatsapp_logs wl 
             LEFT JOIN bookings b ON wl.booking_id = b.id 
             ORDER BY wl.created_at DESC 
             LIMIT $1 OFFSET $2`,
            [ITEMS_PER_PAGE, offset]
        );

        // Get vehicle details for the logs
        const logs = await Promise.all(result.rows.map(async (log) => {
            let vehicleName = null;
            if (log.vehicle_id) {
                const vehicleResult = await query(
                    'SELECT name FROM vehicles WHERE id = $1',
                    [log.vehicle_id]
                );
                if (vehicleResult.rows[0]) {
                    vehicleName = vehicleResult.rows[0].name;
                }
            }

            return {
                ...log,
                vehicle_name: vehicleName
            };
        }));

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