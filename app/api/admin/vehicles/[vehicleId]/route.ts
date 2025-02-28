import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, query } from '@/lib/db';
import logger from '@/lib/logger';
import type { Vehicle, VehicleStatus } from '@/lib/schema';
import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    const vehicle = await db
      .selectFrom('vehicles')
      .selectAll()
      .where('id', '=', vehicleId)
      .executeTakeFirst();

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    logger.info('Updating vehicle with data:', data);

    // Process numeric fields
    const updateData: Record<string, any> = {
      name: data.name,
      type: data.type,
      price_per_hour: Number(data.price_per_hour),
      price_7_days: data.price_7_days ? Number(data.price_7_days) : null,
      price_15_days: data.price_15_days ? Number(data.price_15_days) : null,
      price_30_days: data.price_30_days ? Number(data.price_30_days) : null,
      is_available: data.is_available
    };

    // Ensure location is properly formatted
    if (data.location) {
      let location = data.location;
      if (typeof location === 'string') {
        location = [location];
      } else if (Array.isArray(location)) {
        location = location.map(loc => loc.trim()).filter(Boolean);
      } else if (typeof location === 'object' && location.name) {
        location = Array.isArray(location.name) ? location.name : [location.name];
      }
      updateData.location = JSON.stringify(location);
    }

    // Convert images to JSON if present
    if (data.images) {
      updateData.images = JSON.stringify(data.images);
    }

    // Update the vehicle
    const [updatedVehicle] = await db
      .updateTable('vehicles')
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'location',
        'quantity',
        'price_per_hour',
        'price_7_days',
        'price_15_days',
        'price_30_days',
        'min_booking_hours',
        'images',
        'status',
        'is_available',
        'created_at',
        'updated_at'
      ])
      .execute();

    if (!updatedVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedVehicle = {
      ...updatedVehicle,
      location: JSON.parse(updatedVehicle.location),
      images: JSON.parse(updatedVehicle.images)
    };

    return NextResponse.json({
      success: true,
      data: {
        vehicle: formattedVehicle
      }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    // Check for any active or pending bookings
    const activeBookings = await db
      .selectFrom('bookings')
      .select(['id', 'status', 'start_date', 'end_date', 'payment_status'])
      .where('vehicle_id', '=', vehicleId)
      .where('status', 'in', ['pending', 'confirmed'])
      .where('payment_status', 'in', ['pending', 'paid'])
      .execute();

    if (activeBookings.length > 0) {
      logger.warn('Attempted to delete vehicle with active/pending bookings:', {
        vehicleId,
        activeBookings: activeBookings.map(b => ({
          id: b.id,
          status: b.status,
          paymentStatus: b.payment_status
        }))
      });
      
      // Return detailed information about the active/pending bookings
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete vehicle with active or pending bookings',
          details: {
            message: 'Vehicle has active or pending bookings that need to be handled first.',
            activeBookings: activeBookings.map(booking => ({
              id: booking.id,
              status: booking.status,
              paymentStatus: booking.payment_status,
              startDate: booking.start_date,
              endDate: booking.end_date
            }))
          }
        },
        { status: 400 }
      );
    }

    // Check if vehicle exists before attempting to update
    const existingVehicle = await db
      .selectFrom('vehicles')
      .select(['id', 'status'])
      .where('id', '=', vehicleId)
      .executeTakeFirst();

    if (!existingVehicle) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle not found'
      }, { status: 404 });
    }

    // Instead of deleting, update the vehicle status to 'retired'
    const [updatedVehicle] = await db
      .updateTable('vehicles')
      .set({
        status: 'retired' as VehicleStatus,
        is_available: false,
        updated_at: new Date()
      })
      .where('id', '=', vehicleId)
      .returning(['id', 'name', 'status', 'is_available'])
      .execute();

    logger.info('Vehicle retired successfully:', {
      vehicleId,
      newStatus: updatedVehicle.status
    });

    return NextResponse.json({
      success: true,
      message: 'Vehicle retired successfully',
      vehicle: updatedVehicle
    });

  } catch (error) {
    logger.error('Error retiring vehicle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retire vehicle',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 