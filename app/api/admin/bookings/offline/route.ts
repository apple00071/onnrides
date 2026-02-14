import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { query, withTransaction } from '@/lib/db';
import { randomUUID } from 'crypto';
import { generateBookingId } from '@/lib/utils/booking-id';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';
import { uploadFile } from '@/lib/upload';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify that the user exists in the database using email
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );

    if (!userResult.rows.length) {
      return new NextResponse('User not found in database', { status: 404 });
    }

    const userId = userResult.rows[0].id;

    const formData = await request.formData();

    // Verify vehicle exists
    const vehicleId = formData.get('vehicleId') as string;
    const vehicleResult = await query(
      'SELECT type, name FROM vehicles WHERE id = $1',
      [vehicleId]
    );

    if (!vehicleResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicleType = vehicleResult.rows[0].type || '';
    const vehicleName = vehicleResult.rows[0].name || '';

    // Handle file uploads using uploadFile utility
    const uploadScan = async (name: string) => {
      const file = formData.get(name) as File;
      if (file && file.size > 0) {
        return await uploadFile(file, `bookings/offline/${name}`);
      }
      return null;
    };

    const dlScanUrl = await uploadScan('dlScan');
    const aadharScanUrl = await uploadScan('aadharScan');
    const selfieUrl = await uploadScan('selfie');

    // Create a new booking with readable ID
    const displayBookingId = generateBookingId(vehicleType);

    // Start transaction using withTransaction helper
    const booking = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO bookings (
          id,
          booking_id,
          user_id,
          vehicle_id,
          start_date,
          end_date,
          total_price,
          rental_amount,
          security_deposit_amount,
          total_amount,
          status,
          booking_type,
          customer_name,
          phone_number,
          email,
          alternate_phone,
          aadhar_number,
          father_number,
          mother_number,
          date_of_birth,
          dl_number,
          dl_expiry_date,
          permanent_address,
          vehicle_model,
          registration_number,
          payment_method,
          paid_amount,
          pending_amount,
          payment_status,
          payment_reference,
          dl_scan,
          aadhar_scan,
          selfie,
          terms_accepted,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *`,
        [
          randomUUID(),
          displayBookingId,
          userId,
          vehicleId,
          formData.get('startDateTime'),
          formData.get('endDateTime'),
          formData.get('totalAmount'),
          formData.get('rentalAmount'),
          formData.get('securityDepositAmount'),
          formData.get('totalAmount'),
          'active',
          'offline',
          formData.get('customerName'),
          formData.get('phoneNumber'),
          formData.get('email'),
          formData.get('alternatePhone'),
          formData.get('aadharNumber'),
          formData.get('fatherNumber'),
          formData.get('motherNumber'),
          formData.get('dateOfBirth') || null,
          formData.get('dlNumber'),
          formData.get('dlExpiryDate'),
          formData.get('permanentAddress'),
          formData.get('vehicleModel'),
          formData.get('registrationNumber'),
          formData.get('paymentMethod'),
          formData.get('paidAmount'),
          formData.get('pendingAmount'),
          formData.get('paymentStatus'),
          formData.get('paymentReference'),
          dlScanUrl,
          aadharScanUrl,
          selfieUrl,
          formData.get('termsAccepted') === 'true'
        ]
      );

      const newBooking = result.rows[0];

      // Create payment record if paid amount exists
      const paidAmountStr = formData.get('paidAmount') as string;
      const paidAmount = parseFloat(paidAmountStr || '0');
      if (paidAmount > 0) {
        await client.query(
          `INSERT INTO payments (
            id,
            booking_id,
            amount,
            status,
            method,
            reference,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            newBooking.id,
            paidAmount,
            'completed',
            formData.get('paymentMethod'),
            formData.get('paymentReference')
          ]
        );
      }
      return newBooking;
    });

    // Send WhatsApp notification outside transaction
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      await whatsappService.sendOfflineBookingConfirmation({
        id: booking.id,
        booking_id: displayBookingId,
        customer_name: (formData.get('customerName') as string),
        phone_number: (formData.get('phoneNumber') as string),
        email: (formData.get('email') as string),
        vehicle_model: (formData.get('vehicleModel') as string),
        registration_number: (formData.get('registrationNumber') as string),
        start_date: new Date(formData.get('startDateTime') as string),
        end_date: new Date(formData.get('endDateTime') as string),
        total_amount: Number(formData.get('totalAmount')),
        pickup_location: 'Office Location',
        status: 'active'
      });

      logger.info('Offline booking WhatsApp notification sent successfully', { bookingId: displayBookingId });
    } catch (waError) {
      logger.error('WhatsApp notification failed:', waError);
    }

    return NextResponse.json({ success: true, booking });

  } catch (dbError) {
    await query('ROLLBACK');
    logger.error('Error creating offline booking:', dbError);
    return NextResponse.json({
      success: false,
      error: dbError instanceof Error ? dbError.message : 'Database error'
    }, { status: 500 });
  }
} catch (error) {
  logger.error('Error in offline booking route:', error);
  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : 'Internal Server Error'
  }, { status: 500 });
}
}