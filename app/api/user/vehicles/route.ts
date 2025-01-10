import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  registration_number: string;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database connection
    client = await pool.connect();

    try {
      // Get vehicles owned by the user
      const result = await client.query<Vehicle>(`
        SELECT 
          v.*
        FROM vehicles v
        JOIN user_vehicles uv ON v.id = uv.vehicle_id
        WHERE uv.user_id = (SELECT id FROM users WHERE email = $1)
        ORDER BY v.created_at DESC
      `, [user.email]);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
} 