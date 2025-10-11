import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { generateBookingId } from '@/lib/utils/booking-id';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

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
    
    // Convert FormData to object and handle files
    const data: Record<string, any> = {};
    const entries = Array.from(formData.entries()) as [string, string | Blob][];
    for (const [key, value] of entries) {
      if (value instanceof Blob) {
        // Convert blob to base64 string
        const buffer = await value.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        data[key] = `data:${value.type};base64,${base64}`;
      } else {
        data[key] = value;
      }
    }

    // Get vehicle type for booking ID generation
    const vehicleResult = await query(
      'SELECT type FROM vehicles WHERE id = $1',
      [data.vehicleId]
    );

    const vehicleType = vehicleResult.rows[0]?.type || '';

    // Create a new booking with readable ID
    const bookingId = generateBookingId(vehicleType);
    const result = await query(
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
        terms_accepted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      ) RETURNING *`,
      [
        randomUUID(),
        bookingId,
        userId,
        data.vehicleId,
        data.startDateTime,
        data.endDateTime,
        data.totalAmount,
        data.rentalAmount,
        data.securityDepositAmount,
        data.totalAmount,
        'active', // Set status to active for offline bookings
        'offline',
        data.customerName,
        data.phoneNumber,
        data.email,
        data.alternatePhone,
        data.aadharNumber,
        data.fatherNumber,
        data.motherNumber,
        data.dateOfBirth || null,
        data.dlNumber,
        data.dlExpiryDate,
        data.permanentAddress,
        data.vehicleModel,
        data.registrationNumber,
        data.paymentMethod,
        data.paidAmount,
        data.pendingAmount,
        data.paymentStatus,
        data.paymentReference,
        data.dlScan,
        data.aadharScan,
        data.selfie,
        data.termsAccepted === 'true'
      ]
    );

    // Create payment record if paid amount exists
    if (parseFloat(data.paidAmount) > 0) {
      await query(
        `INSERT INTO payments (
          id,
          booking_id,
          amount,
          status,
          method,
          reference
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          result.rows[0].id,
          data.paidAmount,
          'completed',
          data.paymentMethod,
          data.paymentReference
        ]
      );
    }

    // Send WhatsApp notification for offline booking
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      const booking = result.rows[0];

      await whatsappService.sendOfflineBookingConfirmation({
        id: booking.id,
        booking_id: bookingId,
        customer_name: data.customerName,
        phone_number: data.phoneNumber,
        email: data.email,
        vehicle_model: data.vehicleModel,
        registration_number: data.registrationNumber,
        start_date: new Date(data.startDateTime),
        end_date: new Date(data.endDateTime),
        total_amount: Number(data.totalAmount),
        pickup_location: 'Office Location', // Default for offline bookings
        status: 'active'
      });

      console.log('Offline booking WhatsApp notification sent successfully', { bookingId });
    } catch (whatsappError) {
      console.error('Failed to send offline booking WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error('Error creating offline booking:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 });
  }
} 