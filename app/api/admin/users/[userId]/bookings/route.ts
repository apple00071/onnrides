import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!currentUser || currentUser.role !== 'admin') {
      logger.debug('Unauthorized access attempt to user bookings');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    try {
      

      // Transform the data to ensure all fields are properly typed
      

      logger.debug(`Successfully fetched ${bookings.length} bookings for user ${userId}`);
      return NextResponse.json(bookings);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user bookings' },
      { status: 500 }
    );
  }
} 