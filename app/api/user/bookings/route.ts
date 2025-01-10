import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import logger from '@/lib/logger';

interface BookingRecord {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  total_amount: number;
  status: string;
  created_at: string;
  vehicle_name: string;
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  vehicle_type: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  price_per_day: number;
  images: string[];
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get database connection
    client = await pool.connect();

    // Get user's bookings with vehicle details
    const result = await client.query(
      `SELECT 
        b.id,
        b.vehicle_id,
        b.start_date,
        b.end_date,
        b.pickup_location,
        b.drop_location,
        b.total_amount,
        b.status,
        b.created_at,
        v.name as vehicle_name,
        v.brand,
        v.model,
        v.year,
        v.registration_number,
        v.type as vehicle_type,
        v.fuel_type,
        v.transmission,
        v.seats,
        v.price_per_day,
        v.images
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY b.created_at DESC`,
      [session.user.email]
    );

    return NextResponse.json({
      bookings: result.rows.map((booking: BookingRecord) => ({
        id: booking.id,
        vehicleId: booking.vehicle_id,
        startDate: booking.start_date,
        endDate: booking.end_date,
        pickupLocation: booking.pickup_location,
        dropLocation: booking.drop_location,
        totalAmount: booking.total_amount,
        status: booking.status,
        createdAt: booking.created_at,
        vehicle: {
          name: booking.vehicle_name,
          brand: booking.brand,
          model: booking.model,
          year: booking.year,
          registrationNumber: booking.registration_number,
          type: booking.vehicle_type,
          fuelType: booking.fuel_type,
          transmission: booking.transmission,
          seats: booking.seats,
          pricePerDay: booking.price_per_day,
          images: booking.images
        }
      }))
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch bookings',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
}

interface CreateBookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropLocation: string;
}

export async function POST(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json() as CreateBookingBody;
    const { 
      vehicleId,
      startDate,
      endDate,
      pickupLocation,
      dropLocation
    } = body;

    // Validate input
    if (!vehicleId || !startDate || !endDate || !pickupLocation || !dropLocation) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Get database connection
    client = await pool.connect();

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Get vehicle details
      const vehicleResult = await client.query(
        'SELECT * FROM vehicles WHERE id = $1 AND status = $2',
        [vehicleId, 'available']
      );

      if (vehicleResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Vehicle not available' },
          { status: 400 }
        );
      }

      const vehicle = vehicleResult.rows[0];

      // Check if vehicle is already booked for the selected dates
      const conflictResult = await client.query(
        `SELECT id FROM bookings 
         WHERE vehicle_id = $1 
         AND status = 'confirmed'
         AND (
           (start_date <= $2 AND end_date >= $2)
           OR (start_date <= $3 AND end_date >= $3)
           OR (start_date >= $2 AND end_date <= $3)
         )`,
        [vehicleId, startDate, endDate]
      );

      if (conflictResult.rows.length > 0) {
        return NextResponse.json(
          { message: 'Vehicle not available for selected dates' },
          { status: 400 }
        );
      }

      // Calculate total amount
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      const days = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = days * vehicle.price_per_day;

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          user_id,
          vehicle_id,
          start_date,
          end_date,
          pickup_location,
          drop_location,
          total_amount,
          status
        ) VALUES (
          (SELECT id FROM users WHERE email = $1),
          $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *`,
        [
          session.user.email,
          vehicleId,
          startDate,
          endDate,
          pickupLocation,
          dropLocation,
          totalAmount,
          'pending'
        ]
      );

      // Update vehicle status
      await client.query(
        'UPDATE vehicles SET status = $1 WHERE id = $2',
        ['booked', vehicleId]
      );

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Booking created successfully',
        booking: {
          id: bookingResult.rows[0].id,
          vehicleId,
          startDate,
          endDate,
          pickupLocation,
          dropLocation,
          totalAmount,
          status: 'pending',
          createdAt: bookingResult.rows[0].created_at
        }
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create booking',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
} 