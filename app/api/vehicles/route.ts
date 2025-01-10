import logger from '@/lib/logger';

import pool from '@/lib/db';


export 

export async function GET(request: NextRequest) {
  
  
  try {
    
    
    
    
    

    const queryParams: unknown[] = [];
    const conditions: string[] = ['v.status = \'active\''];

    if (type) {
      conditions.push('LOWER(v.type) = LOWER($' + (queryParams.length + 1) + ')');
      queryParams.push(type);
    }

    if (location) {
      conditions.push('LOWER(v.location) = LOWER($' + (queryParams.length + 1) + ')');
      queryParams.push(location);
    }

    // Add booking date filter if both pickup and dropoff are provided
    if (pickup && dropoff) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.vehicle_id = v.id 
          AND b.status = 'confirmed'
          AND (
            (b.pickup_datetime <= $${queryParams.length + 1} AND b.dropoff_datetime >= $${queryParams.length + 1})
            OR (b.pickup_datetime <= $${queryParams.length + 2} AND b.dropoff_datetime >= $${queryParams.length + 2})
            OR (b.pickup_datetime >= $${queryParams.length + 1} AND b.dropoff_datetime <= $${queryParams.length + 2})
          )
        )
      `);
      queryParams.push(pickup, dropoff);
    }

    

    
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  
  
  try {
    
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    
    
    // Validate required fields
    
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Start transaction
    await client.query('BEGIN');

    

    await client.query('COMMIT');
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 