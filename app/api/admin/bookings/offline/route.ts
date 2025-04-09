import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import logger from '@/lib/logger';
// @ts-ignore
import type { PrismaClient } from '@prisma/client';

// Function to generate booking ID in ORXXX format
async function generateBookingId() {
  // Get the latest booking with OR prefix
  const latestBooking = await prisma.bookings.findFirst({
    where: {
      booking_id: {
        startsWith: 'OR'
      }
    },
    orderBy: {
      booking_id: 'desc'
    }
  });

  if (!latestBooking) {
    return 'OR001'; // First booking
  }

  // Extract the number from the latest booking ID
  const lastNumber = parseInt(latestBooking.booking_id.slice(2));
  // Generate new number with leading zeros
  const newNumber = String(lastNumber + 1).padStart(3, '0');
  return `OR${newNumber}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Extract file data
    const dlFront = formData.get('dlFront') as File;
    const dlBack = formData.get('dlBack') as File;
    const aadhaarFront = formData.get('aadhaarFront') as File;
    const aadhaarBack = formData.get('aadhaarBack') as File;
    const customerPhoto = formData.get('customerPhoto') as File;

    // Extract other form data
    const customerName = formData.get('customerName') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const vehicleId = formData.get('vehicleId') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const totalAmount = formData.get('totalAmount') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const paymentStatus = formData.get('paymentStatus') as string;
    const paymentReference = formData.get('paymentReference') as string;
    const signature = formData.get('signature') as string;
    const notes = formData.get('notes') as string;

    // Validate required fields
    const requiredFields = {
      customerName,
      customerPhone,
      vehicleId,
      startDate,
      endDate,
      totalAmount,
      paymentMethod,
      paymentStatus,
      dlFront,
      dlBack,
      aadhaarFront,
      aadhaarBack,
      customerPhoto
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format'
      }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json({
        success: false,
        error: 'End date must be after start date'
      }, { status: 400 });
    }

    const totalHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));

    // Verify vehicle exists and is available
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle not found'
      }, { status: 404 });
    }

    // Upload documents to Vercel Blob
    const [dlFrontBlob, dlBackBlob, aadhaarFrontBlob, aadhaarBackBlob, customerPhotoBlob] = await Promise.all([
      put(`documents/dl/${uuidv4()}-${dlFront.name}`, dlFront, {
        access: 'public',
      }),
      put(`documents/dl/${uuidv4()}-${dlBack.name}`, dlBack, {
        access: 'public',
      }),
      put(`documents/aadhaar/${uuidv4()}-${aadhaarFront.name}`, aadhaarFront, {
        access: 'public',
      }),
      put(`documents/aadhaar/${uuidv4()}-${aadhaarBack.name}`, aadhaarBack, {
        access: 'public',
      }),
      put(`documents/photos/${uuidv4()}-${customerPhoto.name}`, customerPhoto, {
        access: 'public',
      })
    ]);

    // Generate booking ID in ORXXX format
    const bookingId = await generateBookingId();

    const booking = await prisma.$transaction(async (prismaClient: PrismaClient) => {
      // Create a temporary user for offline booking if email is provided
      let userId = uuidv4();
      if (customerEmail) {
        const existingUser = await prismaClient.users.findUnique({
          where: { email: customerEmail }
        });

        if (!existingUser) {
          await prismaClient.users.create({
            data: {
              id: userId,
              email: customerEmail,
              name: customerName,
              phone: customerPhone,
              role: 'user',
              is_verified: true
            }
          });
        } else {
          userId = existingUser.id;
        }
      }

      // Create documents records
      await prismaClient.documents.createMany({
        data: [
          {
            id: uuidv4(),
            user_id: userId,
            type: 'driving_license_front',
            file_url: dlFrontBlob.url,
            status: 'pending'
          },
          {
            id: uuidv4(),
            user_id: userId,
            type: 'driving_license_back',
            file_url: dlBackBlob.url,
            status: 'pending'
          },
          {
            id: uuidv4(),
            user_id: userId,
            type: 'aadhaar_front',
            file_url: aadhaarFrontBlob.url,
            status: 'pending'
          },
          {
            id: uuidv4(),
            user_id: userId,
            type: 'aadhaar_back',
            file_url: aadhaarBackBlob.url,
            status: 'pending'
          },
          {
            id: uuidv4(),
            user_id: userId,
            type: 'customer_photo',
            file_url: customerPhotoBlob.url,
            status: 'pending'
          }
        ]
      });

      const newBooking = await prismaClient.bookings.create({
        data: {
          id: uuidv4(),
          booking_id: bookingId,
          user_id: userId,
          vehicle_id: vehicleId,
          start_date: start,
          end_date: end,
          total_hours: totalHours,
          total_price: parseFloat(totalAmount),
          status: 'CONFIRMED',
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          payment_details: JSON.stringify({
            method: paymentMethod,
            reference: paymentReference,
            signature: signature || null,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail
          }),
          booking_type: 'offline',
          created_by: session.user.id,
          notes: notes || null,
        },
      });

      await prismaClient.vehicles.update({
        where: { id: vehicleId },
        data: { status: 'BOOKED' },
      });

      return newBooking;
    });

    logger.info('Offline booking created successfully', {
      bookingId: booking.booking_id,
      vehicleId,
      customerName,
      customerPhone
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    logger.error('Error creating offline booking:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 });
  }
} 