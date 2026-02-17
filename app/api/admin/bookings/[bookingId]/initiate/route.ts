import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import logger from '@/lib/logger';
import { uploadFile } from '@/lib/upload';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';
import { randomUUID } from 'crypto';

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
    const bookingIdParam = resolvedParams.bookingId;
    if (!bookingIdParam) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get internal booking ID (UUID)
    // Support both internal UUID and the user-friendly booking_id
    const bookingResult = await query(
      'SELECT id, security_deposit_amount FROM bookings WHERE id::text = $1 OR TRIM(booking_id) ILIKE TRIM($1)',
      [bookingIdParam]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    const bookingRow = bookingResult.rows[0];
    const bookingId = bookingRow.id;
    const securityDepositAmount = parseFloat(bookingRow.security_deposit_amount) || 0;

    const formData = await request.formData();

    let customerInfo: any;
    try {
      customerInfo = JSON.parse(formData.get('customerInfo') as string || '{}');
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid data format' },
        { status: 400 }
      );
    }
    const tripNotes = formData.get('tripNotes') as string;
    const vehicleNumber = formData.get('vehicleNumber') as string;
    const termsAccepted = formData.get('termsAccepted') === 'true';

    // Operational Data
    const fuelLevel = formData.get('fuelLevel') as string;
    const odometerReading = formData.get('odometerReading') as string;
    const damageNotes = formData.get('damageNotes') as string;
    const cleanlinessNotes = formData.get('cleanlinessNotes') as string;

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

    // Use a transaction to ensure atomicity
    await withTransaction(async (client: any) => {
      // Runtime Migration: Ensure columns exist
      await client.query(`
        ALTER TABLE trip_initiations 
        ADD COLUMN IF NOT EXISTS fuel_level VARCHAR(50),
        ADD COLUMN IF NOT EXISTS odometer_reading VARCHAR(50),
        ADD COLUMN IF NOT EXISTS damage_notes TEXT,
        ADD COLUMN IF NOT EXISTS cleanliness_notes TEXT,
        ADD COLUMN IF NOT EXISTS checklist_details JSONB
      `);

      // Check if trip initiation exists
      const existingInitiationResult = await client.query(
        'SELECT id, documents FROM trip_initiations WHERE booking_id = $1',
        [bookingId]
      );

      if (existingInitiationResult.rows.length > 0) {
        const existingDocs = existingInitiationResult.rows[0].documents || {};
        const mergedDocs = { ...existingDocs, ...documentUrls };

        // Update existing trip initiation
        await client.query(`
          UPDATE trip_initiations SET
            customer_name = $1,
            customer_phone = $2,
            customer_email = $3,
            customer_dl_number = $4,
            customer_address = $5,
            emergency_contact = $6,
            emergency_name = $7,
            customer_aadhaar_number = $8,
            customer_dob = $9,
            vehicle_number = $10,
            documents = $11,
            terms_accepted = $12,
            notes = $13,
            fuel_level = $14,
            odometer_reading = $15,
            damage_notes = $16,
            cleanliness_notes = $17,
            updated_at = NOW()
          WHERE booking_id = $18
        `, [
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
          JSON.stringify(mergedDocs),
          termsAccepted,
          tripNotes,
          fuelLevel,
          odometerReading,
          damageNotes,
          cleanlinessNotes,
          bookingId
        ]);
      } else {
        // Create new trip initiation
        await client.query(`
          INSERT INTO trip_initiations (
            booking_id,
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
            notes,
            fuel_level,
            odometer_reading,
            damage_notes,
            cleanliness_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          bookingId,
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
          fuelLevel,
          odometerReading,
          damageNotes,
          cleanlinessNotes
        ]);
      }

      await client.query(`
        UPDATE bookings SET
          status = 'initiated',
          security_deposit_amount = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [securityDepositAmount, bookingId]);

      // Update vehicle status
      await client.query(`
        UPDATE vehicles SET
          is_available = false,
          updated_at = NOW()
        WHERE id = (SELECT vehicle_id FROM bookings WHERE id = $1)
      `, [bookingId]);
    });

    // Send WhatsApp trip start confirmation
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      await whatsappService.sendTripStartConfirmation({
        booking_id: bookingId,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        vehicle_number: vehicleNumber,
        emergency_contact: customerInfo.emergencyContact,
        emergency_name: customerInfo.emergencyName,
        security_deposit_amount: securityDepositAmount
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const bookingIdParam = resolvedParams.bookingId;

    if (!bookingIdParam) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get internal booking ID (UUID)
    // Support both internal UUID and the user-friendly booking_id
    const bookingResult = await query(
      'SELECT id FROM bookings WHERE id::text = $1 OR TRIM(booking_id) ILIKE TRIM($1)',
      [bookingIdParam]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    const bookingId = bookingResult.rows[0].id;

    const result = await query(
      `SELECT * FROM trip_initiations WHERE booking_id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Trip initiation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      initiation: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching trip initiation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trip initiation'
      },
      { status: 500 }
    );
  }
}
