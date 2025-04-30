import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pickupDate = url.searchParams.get('pickupDate');
    const pickupTime = url.searchParams.get('pickupTime');
    const dropoffDate = url.searchParams.get('dropoffDate');
    const dropoffTime = url.searchParams.get('dropoffTime');
    const type = url.searchParams.get('type');
    const duration = url.searchParams.get('duration');

    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime || !type || !duration) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Convert dates and times to proper format
    const pickupDateTime = new Date(`${pickupDate}T${decodeURIComponent(pickupTime)}:00`);
    const dropoffDateTime = new Date(`${dropoffDate}T${decodeURIComponent(dropoffTime)}:00`);

    // Find available delivery partners using raw SQL
    const result = await query(`
      SELECT 
        dp.*,
        u.name as user_name,
        u.phone as user_phone
      FROM "DeliveryPartner" dp
      LEFT JOIN users u ON dp.user_id = u.id
      WHERE dp.is_available = true
        AND dp.vehicle_type = $1
      ORDER BY dp.rating DESC
    `, [type.toLowerCase()]);

    const availablePartners = result.rows;

    logger.info('Found delivery partners:', {
      count: availablePartners.length,
      pickupDateTime,
      dropoffDateTime,
      type,
      duration
    });

    return NextResponse.json(availablePartners);
  } catch (error) {
    logger.error('Error fetching delivery partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery partners' },
      { status: 500 }
    );
  }
} 