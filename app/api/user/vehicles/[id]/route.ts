import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    
    const { is_available } = body;

    if (typeof is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'is_available must be a boolean' },
        { status: 400 }
      );
    }

    
    try {
      // First check if the vehicle belongs to the user
      

      if (vehicleResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found or unauthorized' },
          { status: 404 }
        );
      }

      // Check if there are any active bookings for this vehicle
      if (!is_available) {
        

        if (bookingsResult.rows[0].count > 0) {
          return NextResponse.json(
            { error: 'Cannot mark vehicle as unavailable while it has active bookings' },
            { status: 400 }
          );
        }
      }

      // Update the vehicle availability
      

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
} 