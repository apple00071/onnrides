import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { uploadFile } from '@/lib/upload';

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

    // Check if trip initiation exists
    const existingInitiation = await prisma.tripInitiation.findUnique({
      where: { booking_id: bookingId }
    });

    if (existingInitiation) {
      // Update existing trip initiation
      await prisma.tripInitiation.update({
        where: { booking_id: bookingId },
        data: {
          checklist_completed: Object.values(checklist).every(v => v === true),
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_email: customerInfo.email,
          customer_dl_number: customerInfo.dlNumber,
          customer_address: customerInfo.address,
          emergency_contact: customerInfo.emergencyContact,
          emergency_name: customerInfo.emergencyName,
          customer_aadhaar_number: customerInfo.aadhaarNumber,
          customer_dob: customerInfo.dob,
          vehicle_number: vehicleNumber,
          documents: documentUrls,
          terms_accepted: termsAccepted,
          notes: tripNotes,
          updated_at: new Date()
        }
      });
    } else {
      // Create new trip initiation
      await prisma.tripInitiation.create({
        data: {
          booking_id: bookingId,
          checklist_completed: Object.values(checklist).every(v => v === true),
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_email: customerInfo.email,
          customer_dl_number: customerInfo.dlNumber,
          customer_address: customerInfo.address,
          emergency_contact: customerInfo.emergencyContact,
          emergency_name: customerInfo.emergencyName,
          customer_aadhaar_number: customerInfo.aadhaarNumber,
          customer_dob: customerInfo.dob,
          vehicle_number: vehicleNumber,
          documents: documentUrls,
          terms_accepted: termsAccepted,
          notes: tripNotes
        }
      });
    }

    // Update booking status
    await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: 'initiated',
        updated_at: new Date()
      }
    });

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