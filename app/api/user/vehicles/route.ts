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
      // Get vehicles owned by the user
      

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