import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;

    const result = await query(`
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.price_per_hour as vehicle_price_per_hour,
        v.location as vehicle_location,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.customer_name
          ELSE u.name
        END as effective_user_name,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.phone_number
          ELSE u.phone
        END as effective_user_phone,
        CASE 
          WHEN b.booking_type = 'offline' THEN b.email
          ELSE u.email
        END as effective_user_email,
        p.status as payment_status,
        p.reference as payment_reference,
        p.method as payment_method
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.booking_id = $1 AND (b.user_id = $2 OR $3 = 'admin')
    `, [resolvedParams.bookingId, session.user.id, session.user.role]);

    if (result.rows.length === 0) {
      return new NextResponse('Booking not found', { status: 404 });
    }

    const booking = result.rows[0];

    // Transform the data to match the interface
    const transformedBooking = {
      id: booking.id,
      bookingId: booking.booking_id,
      displayId: booking.booking_id,
      userId: booking.user_id,
      vehicle: {
        id: booking.vehicle_id,
        name: booking.vehicle_name,
        type: booking.vehicle_type,
        pricePerDay: booking.vehicle_price_per_hour * 24,
        location: booking.vehicle_location
      },
      startDate: booking.start_date,
      endDate: booking.end_date,
      totalPrice: parseFloat(booking.total_amount || booking.total_price),
      status: booking.status,
      paymentStatus: booking.payment_status || 'pending',
      paymentReference: booking.payment_reference,
      paymentMethod: booking.payment_method,
      bookingType: booking.booking_type,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      // Offline booking details
      customerName: booking.customer_name,
      phoneNumber: booking.phone_number,
      email: booking.email,
      alternatePhone: booking.alternate_phone,
      aadharNumber: booking.aadhar_number,
      fatherNumber: booking.father_number,
      motherNumber: booking.mother_number,
      dateOfBirth: booking.date_of_birth,
      dlNumber: booking.dl_number,
      dlExpiryDate: booking.dl_expiry_date,
      permanentAddress: booking.permanent_address,
      registrationNumber: booking.registration_number,
      rentalAmount: parseFloat(booking.rental_amount),
      securityDepositAmount: parseFloat(booking.security_deposit_amount),
      paidAmount: parseFloat(booking.paid_amount),
      pendingAmount: parseFloat(booking.pending_amount),
      dlScan: booking.dl_scan,
      aadharScan: booking.aadhar_scan,
      selfie: booking.selfie
    };

    return NextResponse.json({ success: true, data: transformedBooking });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}