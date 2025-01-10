import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    
    try {
      // First check if the booking belongs to the user and is in a cancellable state
      

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found or unauthorized' },
          { status: 404 }
        );
      }

      
      if (booking.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending bookings can be cancelled' },
          { status: 400 }
        );
      }

      // Update the booking status to cancelled
      

      // Update the vehicle availability
      await client.query(`
        UPDATE vehicles v
        SET is_available = true
        FROM bookings b
        WHERE b.id = $1 AND b.vehicle_id = v.id
      `, [bookingId]);

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
} 