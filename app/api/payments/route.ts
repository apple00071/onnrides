import logger from '@/lib/logger';

import pool from '@/lib/db';
import QRCode from 'qrcode';


export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, amount } = await request.json();
    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: 'Booking ID and amount are required' },
        { status: 400 }
      );
    }

    
    try {
      // Get booking details
      

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      

      // Generate payment reference
      

      // Create payment record
      await client.query(`
        UPDATE bookings 
        SET payment_status = 'pending', 
            payment_reference = $1
        WHERE id = $2
      `, [paymentRef, bookingId]);

      // Generate QR code data
      

      // Generate QR code
      

      return NextResponse.json({
        success: true,
        qrCode,
        paymentRef,
        bookingDetails: {
          ...booking,
          amount
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
} 