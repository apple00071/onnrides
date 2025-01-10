import logger from '@/lib/logger';

import pool from '@/lib/db';


export 

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    try {
      // Get total bookings and total spent
      

      // Get total vehicles (available for booking)
      

      // Get pending documents
      

      // Get recent bookings
      

      

      return NextResponse.json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 