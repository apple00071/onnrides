import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { parseLocations } from '@/lib/utils/data-normalization';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching to ensure real-time availability

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');

    // 1. Fetch all active vehicles
    const vehiclesResult = await query(
      "SELECT * FROM vehicles WHERE status = 'active' AND is_available = true ORDER BY name ASC"
    );
    let vehicles = vehiclesResult.rows;

    // 2. If dates are provided, filter availability
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      try {
        const startDateTime = new Date(`${pickupDate}T${pickupTime}`);
        const endDateTime = new Date(`${dropoffDate}T${dropoffTime}`);

        if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
          // Fetch overlapping bookings
          const bookingsResult = await query(`
            SELECT vehicle_id, pickup_location
            FROM bookings
            WHERE status NOT IN ('cancelled', 'failed')
            AND (payment_status IS NULL OR payment_status != 'failed')
            AND (
              (start_date - interval '2 hours', end_date + interval '2 hours') OVERLAPS ($1::timestamptz, $2::timestamptz)
               OR ($1::timestamptz BETWEEN (start_date - interval '2 hours') AND (end_date + interval '2 hours'))
               OR ($2::timestamptz BETWEEN (start_date - interval '2 hours') AND (end_date + interval '2 hours'))
            )
          `, [startDateTime.toISOString(), endDateTime.toISOString()]);

          const bookings = bookingsResult.rows;

          // Filter locations for each vehicle
          vehicles = vehicles.map((vehicle: any) => {
            const vehicleLocations = parseLocations(vehicle.location);
            const locationQuantities = vehicle.location_quantities || {};

            const availableLocations = vehicleLocations.filter((loc: string) => {
              // Calculate capacity for this location
              const capacity = locationQuantities[loc] || vehicle.quantity || 0;

              // Count bookings for this vehicle at this location
              const bookingCount = bookings.filter((b: any) =>
                b.vehicle_id === vehicle.id &&
                (
                  (b.pickup_location || '').toLowerCase().includes(loc.toLowerCase()) ||
                  (b.pickup_location || '').toLowerCase().includes(loc.toLowerCase().replace(/"/g, ''))
                )
              ).length;

              return bookingCount < capacity;
            });

            // If no locations available, mark vehicle as unavailable
            if (availableLocations.length === 0) {
              return { ...vehicle, is_available: false, location: [] };
            }

            // Return vehicle with ONLY available locations
            return {
              ...vehicle,
              location: JSON.stringify(availableLocations)
            };
          });
        }
      } catch (error) {
        logger.error('Error processing availability:', error);
      }
    }

    return NextResponse.json({ vehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json({ vehicles: [] });
  }
}