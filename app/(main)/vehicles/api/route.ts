import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { formatDateTimeIST } from '@/lib/utils/timezone';

export async function GET(request: NextRequest) {
  try {
    // Create a URL object from the request url
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const vehicleId = searchParams.get('id');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the vehicle details from database
    const result = await query(`
      SELECT 
        id, 
        name, 
        type, 
        location, 
        quantity,
        "pricePerHour",
        price_per_hour, 
        price_7_days, 
        price_15_days, 
        price_30_days,
        "minBookingHours",
        min_booking_hours,
        images, 
        status, 
        "isAvailable",
        is_available,
        "createdAt",
        "updatedAt"
      FROM vehicles
      WHERE id = $1
    `, [vehicleId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    const vehicle = result.rows[0];
    
    // Make sure we're capturing both camelCase and snake_case versions of price
    const pricePerHour = Number(vehicle.pricePerHour || vehicle.price_per_hour || 0);
    const minBookingHours = Number(vehicle.minBookingHours || vehicle.min_booking_hours || 1);
    
    // Calculate total price based on booking hours if dates are provided
    let pricing = null;
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
      const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}`);
      
      const diffMs = dropoffDateTime.getTime() - pickupDateTime.getTime();
      const totalHours = Math.round(diffMs / (1000 * 60 * 60));
      const chargeableHours = Math.max(totalHours, minBookingHours);
      const totalPrice = pricePerHour * chargeableHours;
      
      pricing = {
        price_per_hour: pricePerHour,
        total_hours: totalHours,
        chargeable_hours: chargeableHours,
        total_price: totalPrice
      };
    }
    
    // Parse locations - ensuring it's an array
    let locations = [];
    try {
      locations = Array.isArray(vehicle.location)
        ? vehicle.location
        : typeof vehicle.location === 'string'
          ? JSON.parse(vehicle.location)
          : [];
    } catch (e) {
      locations = typeof vehicle.location === 'string' ? [vehicle.location] : [];
    }
    
    // Parse images - ensuring it's an array
    let images = [];
    try {
      images = Array.isArray(vehicle.images)
        ? vehicle.images
        : typeof vehicle.images === 'string'
          ? JSON.parse(vehicle.images)
          : [];
    } catch (e) {
      images = [];
    }
    
    // Format the response
    const formattedVehicle = {
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      price_per_hour: pricePerHour,
      pricePerHour: pricePerHour,
      min_booking_hours: minBookingHours,
      minBookingHours: minBookingHours,
      price_7_days: vehicle.price_7_days,
      price_15_days: vehicle.price_15_days,
      price_30_days: vehicle.price_30_days,
      location: locations,
      images: images,
      status: vehicle.status,
      is_available: vehicle.isAvailable || vehicle.is_available,
      isAvailable: vehicle.isAvailable || vehicle.is_available,
      created_at: vehicle.createdAt,
      updated_at: vehicle.updatedAt,
      pricing: pricing
    };
    
    return NextResponse.json(formattedVehicle);
  } catch (error) {
    logger.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle details' },
      { status: 500 }
    );
  }
} 