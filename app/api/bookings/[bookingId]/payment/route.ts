import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;
    const body = await request.json();
    const { status, payment_id, payment_details } = body;

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the booking with vehicle
      const booking = await tx.bookings.findUnique({
        where: { id: bookingId },
        include: { vehicle: true }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // 2. Check if user is authorized
      if (booking.user_id !== session.user.id && session.user.role !== 'admin') {
        throw new Error('Unauthorized to modify this booking');
      }

      // 3. Handle payment status
      if (status === 'failed' || status === 'cancelled') {
        // If payment failed, make vehicle available again
        if (booking.vehicle) {
          await tx.vehicles.update({
            where: { id: booking.vehicle.id },
            data: { is_available: true }
          });
        }

        // Update booking status
        const updatedBooking = await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: 'cancelled',
            payment_status: status,
            payment_intent_id: payment_id || null,
            payment_details: payment_details || null,
            updated_at: new Date()
          }
        });

        return updatedBooking;
      }

      // 4. Handle successful payment
      if (status === 'success') {
        const updatedBooking = await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: 'confirmed',
            payment_status: 'completed',
            payment_intent_id: payment_id,
            payment_details,
            updated_at: new Date()
          }
        });

        return updatedBooking;
      }

      throw new Error('Invalid payment status');
    });

    // Revalidate relevant pages
    revalidatePath('/bookings');
    revalidatePath('/admin/bookings');
    revalidatePath(`/bookings/${bookingId}`);

    return NextResponse.json({
      success: true,
      data: { booking: result }
    });

  } catch (error) {
    logger.error('Error processing payment:', {
      error: error instanceof Error ? error.message : error,
      bookingId: params.bookingId
    });

    const message = error instanceof Error ? error.message : 'Failed to process payment';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 400 }
    );
  }
} 