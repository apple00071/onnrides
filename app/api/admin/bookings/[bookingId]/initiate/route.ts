import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Type definitions for request body
interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  dlNumber?: string;
  aadhaarNumber?: string;
  dob?: string;
  address?: string;
  emergencyContact?: string;
  emergencyName?: string;
}

interface TripInitiationRequest {
  customer: CustomerInfo;
  notes?: string;
  checklistCompleted: boolean;
  vehicleNumber?: string;
  termsAccepted: boolean;
  documents?: {
    dlFront?: string;
    dlBack?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    customerPhoto?: string;
    signature?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookingId = params.bookingId;
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const body: TripInitiationRequest = await request.json();
    const { customer, notes, checklistCompleted, vehicleNumber, documents, termsAccepted } = body;

    if (!customer || !customer.name || !customer.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer name and phone are required' },
        { status: 400 }
      );
    }

    if (!checklistCompleted) {
      return NextResponse.json(
        { success: false, error: 'Checklist must be completed before initiating trip' },
        { status: 400 }
      );
    }
    
    if (!termsAccepted) {
      return NextResponse.json(
        { success: false, error: 'Terms & Conditions must be accepted before initiating trip' },
        { status: 400 }
      );
    }

    // Start a transaction
    await query('BEGIN');

    try {
      // First, check if the booking exists and its current status
      const bookingCheck = await query(
        'SELECT status, user_id, payment_status FROM bookings WHERE id = $1::uuid',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingCheck.rows[0];
      
      // Verify that the booking can be initiated (must be in 'confirmed' status and payment completed)
      if (booking.status !== 'confirmed') {
        throw new Error(`Cannot initiate trip. Booking status is ${booking.status}`);
      }

      if (booking.payment_status !== 'completed') {
        throw new Error('Cannot initiate trip. Payment has not been completed');
      }

      // Update the booking status to 'initiated'
      await query(
        `UPDATE bookings 
         SET status = 'initiated', 
             notes = CASE WHEN $1::text IS NULL OR $1::text = '' THEN notes ELSE $1::text END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2::uuid`,
        [notes, bookingId]
      );

      // Update or create trip initiation record
      const existingInitiation = await query(
        'SELECT id FROM trip_initiations WHERE booking_id = $1::uuid',
        [bookingId]
      );

      if (existingInitiation.rows.length > 0) {
        // Update existing trip initiation
        await query(
          `UPDATE trip_initiations 
           SET checklist_completed = $1::uuid, 
               customer_name = $2,
               customer_phone = $3,
               customer_email = $4,
               customer_dl_number = $5,
               customer_address = $6,
               emergency_contact = $7,
               emergency_name = $8,
               customer_aadhaar_number = $9,
               customer_dob = $1::uuid0,
               vehicle_number = $1::uuid1,
               documents = $1::uuid2,
               terms_accepted = $1::uuid3,
               updated_at = CURRENT_TIMESTAMP
           WHERE booking_id = $1::uuid4`,
          [
            checklistCompleted,
            customer.name,
            customer.phone,
            customer.email || null,
            customer.dlNumber || null,
            customer.address || null,
            customer.emergencyContact || null,
            customer.emergencyName || null,
            customer.aadhaarNumber || null,
            customer.dob || null,
            vehicleNumber || null,
            documents ? JSON.stringify(documents) : null,
            termsAccepted,
            bookingId
          ]
        );
      } else {
        // First, check if trip_initiations table exists, if not create it
        await query(`
          CREATE TABLE IF NOT EXISTS trip_initiations (
            id SERIAL PRIMARY KEY,
            booking_id TEXT NOT NULL REFERENCES bookings(id),
            checklist_completed BOOLEAN NOT NULL DEFAULT false,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            customer_dl_number TEXT,
            customer_address TEXT,
            emergency_contact TEXT,
            emergency_name TEXT,
            customer_aadhaar_number TEXT,
            customer_dob TEXT,
            vehicle_number TEXT,
            documents JSONB,
            terms_accepted BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(booking_id)
          )
        `);

        // Insert new trip initiation
        await query(
          `INSERT INTO trip_initiations (
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
            terms_accepted
          ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $1::uuid0, $1::uuid1, $1::uuid2, $1::uuid3, $1::uuid4)`,
          [
            bookingId,
            checklistCompleted,
            customer.name,
            customer.phone,
            customer.email || null,
            customer.dlNumber || null,
            customer.address || null,
            customer.emergencyContact || null,
            customer.emergencyName || null,
            customer.aadhaarNumber || null,
            customer.dob || null,
            vehicleNumber || null,
            documents ? JSON.stringify(documents) : null,
            termsAccepted
          ]
        );
      }

      // If the user ID in the booking doesn't match a user's profile, update or create it
      const userCheck = await query(
        'SELECT id, phone FROM users WHERE id = $1::uuid',
        [booking.user_id]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].phone !== customer.phone) {
        // Check if user exists with the provided phone number
        const existingUser = await query(
          'SELECT id FROM users WHERE phone = $1::uuid',
          [customer.phone]
        );

        if (existingUser.rows.length > 0) {
          // Update the booking to use the existing user
          await query(
            'UPDATE bookings SET user_id = $1::uuid WHERE id = $2::uuid',
            [existingUser.rows[0].id, bookingId]
          );
        } else {
          // Create a new user and update the booking
          const newUser = await query(
            `INSERT INTO users (name, phone, email, role, created_at, updated_at)
             VALUES ($1::uuid, $2, $3, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id::text`,
            [customer.name, customer.phone, customer.email || null]
          );
          
          await query(
            'UPDATE bookings SET user_id = $1::uuid WHERE id = $2::uuid',
            [newUser.rows[0].id, bookingId]
          );
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Trip initiated successfully',
        data: {
          bookingId,
          status: 'initiated'
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
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