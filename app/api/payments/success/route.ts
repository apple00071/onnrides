import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentRef } = await request.json();
    if (!paymentRef) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Get booking by payment reference
      

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      

      // Generate booking ID (format: B-YYYYMMDD-XXXXX)
      
      
      
      

      // Update booking status and add booking number
      await client.query(`
        UPDATE bookings 
        SET payment_status = 'completed',
            status = 'confirmed',
            booking_number = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [bookingNumber, booking.id]);

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        bookingNumber,
        message: 'Payment successful'
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error processing payment success:', error);
    return NextResponse.json(
      { error: 'Failed to process payment success' },
      { status: 500 }
    );
  }
} 