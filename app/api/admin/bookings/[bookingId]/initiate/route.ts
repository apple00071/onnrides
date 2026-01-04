import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { uploadFile } from '@/lib/upload';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.bookingId;
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    // Parse JSON strings from FormData
    const customerInfo = JSON.parse(formData.get('customerInfo') as string);
    const checklist = JSON.parse(formData.get('checklist') as string);
    const tripNotes = formData.get('tripNotes') as string;
    const vehicleNumber = formData.get('vehicleNumber') as string;
    const termsAccepted = formData.get('termsAccepted') === 'true';

    // Handle file uploads
    const documentUrls: Record<string, string> = {};
    const fileTypes = ['dlFront', 'dlBack', 'aadhaarFront', 'aadhaarBack', 'customerPhoto'];

    for (const type of fileTypes) {
      const file = formData.get(type) as File;
      if (file) {
        const url = await uploadFile(file, `trip-initiations/${bookingId}/${type}`);
        documentUrls[type] = url;
      }
    }

    // Handle signature upload
    const signatureFile = formData.get('signature') as File;
    if (signatureFile) {
      const signatureUrl = await uploadFile(signatureFile, `trip-initiations/${bookingId}/signature`);
      documentUrls.signature = signatureUrl;
    }

    const checklistCompleted = Object.values(checklist).every(v => v === true);

    // Use a transaction-like approach (manual for raw queries)
    // Check if trip initiation exists
    const existingInitiationResult = await query(
      'SELECT id FROM trip_initiations WHERE booking_id = $1',
      [bookingId]
    );

    if (existingInitiationResult.rows.length > 0) {
      // Update existing trip initiation
      await query(`
        UPDATE trip_initiations SET
          checklist_completed = $1,
          customer_name = $2,
          customer_phone = $3,
          customer_email = $4,
          customer_dl_number = $5,
          customer_address = $6,
          emergency_contact = $7,
          emergency_name = $8,
          customer_aadhaar_number = $9,
          customer_dob = $10,
          vehicle_number = $11,
          documents = $12,
          terms_accepted = $13,
          notes = $14,
          updated_at = NOW()
        WHERE booking_id = $15
      `, [
        checklistCompleted,
        customerInfo.name,
        customerInfo.phone,
        customerInfo.email,
        customerInfo.dlNumber,
        customerInfo.address,
        customerInfo.emergencyContact,
        customerInfo.emergencyName,
        customerInfo.aadhaarNumber,
        customerInfo.dob,
        vehicleNumber,
        JSON.stringify(documentUrls),
        termsAccepted,
        tripNotes,
        bookingId
      ]);
    } else {
      // Create new trip initiation
      await query(`
        INSERT INTO trip_initiations (
          booking_id,
          checklist_completed,
          customer_name,
          customer_phone,
          customer_email,
          customer_dl_number,
          customer_address,
          emergency_contact,
          emergency_name,
          customer_aadhaar_number,
          customer_dob,
          vehicle_number,
          documents,
          terms_accepted,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        bookingId,
        checklistCompleted,
        customerInfo.name,
        customerInfo.phone,
        customerInfo.email,
        customerInfo.dlNumber,
        customerInfo.address,
        customerInfo.emergencyContact,
        customerInfo.emergencyName,
        customerInfo.aadhaarNumber,
        customerInfo.dob,
        vehicleNumber,
        JSON.stringify(documentUrls),
        termsAccepted,
        tripNotes
      ]);
    }

    // Update booking status
    await query(`
      UPDATE bookings SET
        status = 'initiated',
        updated_at = NOW()
      WHERE id = $1
    `, [bookingId]);

    // Send WhatsApp trip start confirmation
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      await whatsappService.sendTripStartConfirmation({
        booking_id: bookingId,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        vehicle_number: vehicleNumber,
        emergency_contact: customerInfo.emergencyContact,
        emergency_name: customerInfo.emergencyName
      });

      logger.info('Trip start WhatsApp notification sent successfully', { bookingId });
    } catch (whatsappError) {
      logger.error('Failed to send trip start WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({
      success: true,
      message: 'Trip initiated successfully'
    });
  } catch (error) {
    logger.error('Error initiating trip:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate trip'
      },
      { status: 500 }
    );
  }
}