import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { query } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.json();

    // Create a new booking
    const bookingId = createId();
    const result = await query(
      `INSERT INTO bookings (
        id,
        booking_id,
        user_id,
        vehicle_id,
        start_date,
        end_date,
        total_price,
        status,
        booking_type,
        customer_name,
        phone_number,
        email,
        alternate_phone,
        dl_number,
        dl_expiry_date,
        permanent_address,
        vehicle_model,
        registration_number,
        purpose_of_rent,
        payment_method,
        paid_amount,
        due_amount,
        payment_status,
        payment_reference,
        security_deposit_amount,
        dl_scan,
        aadhar_scan,
        selfie,
        agreement_scan,
        original_dl_verified,
        voter_id_verified,
        terms_accepted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING *`,
      [
        createId(),
        bookingId,
        session.user.id,
        formData.vehicleId,
        formData.startDateTime,
        formData.endDateTime,
        formData.paidAmount,
        'confirmed',
        'offline',
        formData.customerName,
        formData.phoneNumber,
        formData.email,
        formData.alternatePhone,
        formData.dlNumber,
        formData.dlExpiryDate,
        formData.permanentAddress,
        formData.vehicleModel,
        formData.registrationNumber,
        formData.purposeOfRent,
        formData.paymentMethod,
        formData.paidAmount,
        formData.dueAmount,
        formData.paymentStatus,
        formData.paymentReference,
        formData.securityDepositAmount,
        formData.dlScan,
        formData.aadharScan,
        formData.selfie,
        formData.agreementScan,
        formData.originalDlVerified,
        formData.voterIdVerified,
        formData.termsAccepted
      ]
    );

    // Create payment record
    if (formData.paidAmount > 0) {
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
          createId(),
          result.rows[0].id,
          formData.paidAmount,
          'completed',
          formData.paymentMethod,
          formData.paymentReference
        ]
      );
    }

    return NextResponse.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error('Error creating offline booking:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 