import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { randomUUID } from 'crypto';
import type { NewVehicle, Vehicle } from '@/lib/schema';
import { withErrorHandler, AuthorizationError, ValidationError } from '@/lib/api-handler';

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  location: string;
  quantity: number;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  min_booking_hours: number;
  images: string;
  status: string;
  is_available: boolean;
  is_delivery_enabled: boolean;
  delivery_price_7_days: number | null;
  delivery_price_15_days: number | null;
  delivery_price_30_days: number | null;
  created_at: Date;
  updated_at: Date;
}

// Helper function to normalize image data
const normalizeImages = (images: any): string[] => {
  logger.debug('Normalizing images input:', { images, type: typeof images });

  // Handle undefined/null case
  if (!images) {
    logger.debug('No images to normalize');
    return [];
  }

  // If images is a File array, convert to URLs (this would be handled by your upload service)
  if (Array.isArray(images) && images[0] instanceof File) {
    logger.debug('Converting File array to URLs');
    // Here you would typically upload these files to your storage service
    // For now, we'll just log this case
    logger.warn('File upload detected but no storage service configured');
    return [];
  }

  // If images is already an array of strings, filter out invalid entries
  if (Array.isArray(images)) {
    const validImages = images.filter(img => img && typeof img === 'string' && img.trim().length > 0);
    logger.debug('Filtered array images:', { validImages });
    return validImages;
  }

  // If images is a string, try to parse it as JSON
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        const validImages = parsed.filter(img => img && typeof img === 'string' && img.trim().length > 0);
        logger.debug('Parsed and filtered JSON string images:', { validImages });
        return validImages;
      }
      // If parsed result is a string, treat it as a single image URL
      if (typeof parsed === 'string' && parsed.trim().length > 0) {
        logger.debug('Single image URL from JSON:', { parsed });
        return [parsed];
      }
    } catch (e) {
      // If parsing fails, check if the string itself is a valid URL
      if (images.trim().length > 0) {
        logger.debug('Using string as single image URL:', { images });
        return [images];
      }
    }
  }

  logger.debug('No valid images found');
  return [];
};

// GET /api/admin/vehicles - List all vehicles
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check if user is admin
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    throw new AuthorizationError('Unauthorized access');
  }

  const result = await query(`
    SELECT * FROM vehicles 
    WHERE status = 'active'
    ORDER BY created_at
  `);

  const formattedVehicles = result.rows.map((vehicle: VehicleRow) => {
    try {
      // Clean up location data
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

      // Clean up images data
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

      return {
        ...vehicle,
        location: locations,
        images: images,
      };
    } catch (error) {
      logger.error('Error formatting vehicle:', {
        vehicleId: vehicle.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }).filter(Boolean);

  return Response.json({ vehicles: formattedVehicles });
});

// POST /api/admin/vehicles - Create vehicle
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check if user is admin
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    throw new AuthorizationError('Unauthorized access');
  }

  // Get the raw data and parse it
  const data = await request.json();

  // Validate required fields
  const missingFields = [];
  if (!data.name) missingFields.push('name');
  if (!data.type) missingFields.push('type');
  if (!data.price_per_hour) missingFields.push('price_per_hour');

  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Ensure location is properly formatted
  let location = data.location;
  if (typeof location === 'string') {
    try {
      // Check if it's stringified JSON
      const parsed = JSON.parse(location);
      location = Array.isArray(parsed) ? parsed : [location];
    } catch (e) {
      location = [location];
    }
  } else if (Array.isArray(location)) {
    location = location.map(loc => typeof loc === 'string' ? loc.trim() : loc).filter(Boolean);
  } else if (typeof location === 'object' && location?.name) {
    location = Array.isArray(location.name) ? location.name : [location.name];
  }

  // Convert location array to JSON string
  const locationJson = JSON.stringify(location || []);

  // Normalize images before saving
  let normalizedImages = data.images;
  if (typeof normalizedImages === 'string') {
    try {
      const parsed = JSON.parse(normalizedImages);
      normalizedImages = Array.isArray(parsed) ? parsed : [normalizedImages];
    } catch (e) {
      normalizedImages = [normalizedImages];
    }
  }
  normalizedImages = Array.isArray(normalizedImages) ? normalizedImages : [];

  // Determine vehicle category
  const vehicleCategory = data.vehicle_category || (data.is_delivery_enabled ? 'both' : 'normal');

  // Generate a UUID for the vehicle
  const vehicleId = randomUUID();

  // Create the vehicle with normalized data
  const result = await query(`
    INSERT INTO vehicles (
      id, name, type, location, quantity, location_quantities,
      price_per_hour, price_7_days, price_15_days, price_30_days, 
      min_booking_hours, images, status, is_available,
      is_delivery_enabled, delivery_price_7_days, delivery_price_15_days, delivery_price_30_days,
      vehicle_category, zero_deposit,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *
  `, [
    vehicleId,
    data.name,
    data.type,
    locationJson,
    Number(data.quantity) || 1,
    JSON.stringify(data.location_quantities || {}), // Per-location breakdown
    Number(data.price_per_hour),
    data.price_7_days ? Number(data.price_7_days) : null,
    data.price_15_days ? Number(data.price_15_days) : null,
    data.price_30_days ? Number(data.price_30_days) : null,
    Number(data.min_booking_hours) || 1,
    JSON.stringify(normalizedImages),
    data.status || 'active',
    true,
    data.is_delivery_enabled || false,
    data.delivery_price_7_days ? Number(data.delivery_price_7_days) : null,
    data.delivery_price_15_days ? Number(data.delivery_price_15_days) : null,
    data.delivery_price_30_days ? Number(data.delivery_price_30_days) : null,
    vehicleCategory,
    data.zero_deposit || false,
    new Date(),
    new Date()
  ]);

  const vehicle = result.rows[0];

  // Format the response
  const formattedVehicle = {
    ...vehicle,
    location: JSON.parse(vehicle.location),
    images: normalizedImages
  };

  return Response.json({
    success: true,
    data: {
      vehicle: formattedVehicle
    }
  });
});

// PUT /api/admin/vehicles - Update vehicle
export const PUT = withErrorHandler(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...rawUpdate } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle id is required for update' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(rawUpdate, key);

    // Copy primitive fields directly
    for (const key of Object.keys(rawUpdate)) {
      if ([
        'name',
        'type',
        'status',
        'vehicle_category',
        'zero_deposit'
      ].includes(key)) {
        updateData[key] = rawUpdate[key];
      }
    }

    // Explicitly handle vehicle_category if is_delivery_enabled changed but category didn't
    if (has('is_delivery_enabled') && !has('vehicle_category')) {
      updateData.vehicle_category = rawUpdate.is_delivery_enabled ? 'both' : 'normal';
    }

    // Numeric fields
    if (has('price_per_hour')) {
      updateData.price_per_hour = rawUpdate.price_per_hour != null
        ? Number(rawUpdate.price_per_hour)
        : null;
    }
    if (has('quantity')) {
      updateData.quantity = rawUpdate.quantity != null
        ? Number(rawUpdate.quantity)
        : null;
    }
    if (has('min_booking_hours')) {
      updateData.min_booking_hours = rawUpdate.min_booking_hours != null
        ? Number(rawUpdate.min_booking_hours)
        : null;
    }

    // Package prices
    if (has('price_7_days')) {
      updateData.price_7_days = rawUpdate.price_7_days
        ? Number(rawUpdate.price_7_days)
        : null;
    }
    if (has('price_15_days')) {
      updateData.price_15_days = rawUpdate.price_15_days
        ? Number(rawUpdate.price_15_days)
        : null;
    }
    if (has('price_30_days')) {
      updateData.price_30_days = rawUpdate.price_30_days
        ? Number(rawUpdate.price_30_days)
        : null;
    }

    // Delivery prices
    if (has('delivery_price_7_days')) {
      updateData.delivery_price_7_days = rawUpdate.delivery_price_7_days
        ? Number(rawUpdate.delivery_price_7_days)
        : null;
    }
    if (has('delivery_price_15_days')) {
      updateData.delivery_price_15_days = rawUpdate.delivery_price_15_days
        ? Number(rawUpdate.delivery_price_15_days)
        : null;
    }
    if (has('delivery_price_30_days')) {
      updateData.delivery_price_30_days = rawUpdate.delivery_price_30_days
        ? Number(rawUpdate.delivery_price_30_days)
        : null;
    }

    // Boolean flags
    if (has('is_delivery_enabled')) {
      updateData.is_delivery_enabled = Boolean(rawUpdate.is_delivery_enabled);
    }
    if (has('is_available')) {
      updateData.is_available = Boolean(rawUpdate.is_available);
    }

    // Location
    if (has('location')) {
      let location = rawUpdate.location;
      if (typeof location === 'string') {
        try {
          const parsed = JSON.parse(location);
          location = Array.isArray(parsed) ? parsed : [location];
        } catch (e) {
          location = [location];
        }
      } else if (Array.isArray(location)) {
        location = location.map((loc: any) => typeof loc === 'string' ? loc.trim() : loc).filter(Boolean);
      } else if (typeof location === 'object' && location?.name) {
        location = Array.isArray(location.name) ? location.name : [location.name];
      }
      updateData.location = JSON.stringify(location || []);
    }

    // Images
    if (has('images')) {
      let images = rawUpdate.images;
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          images = Array.isArray(parsed) ? parsed : [images];
        } catch (e) {
          images = [images];
        }
      }
      const validImages = Array.isArray(images) ? images : [];
      updateData.images = JSON.stringify(validImages);
    }

    // Location quantities
    if (has('location_quantities')) {
      updateData.location_quantities = JSON.stringify(rawUpdate.location_quantities || {});
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided to update' },
        { status: 400 }
      );
    }

    const setClauses = Object.entries(updateData)
      .map(([key], index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updateData)];

    const result = await query(`
      UPDATE vehicles 
      SET ${setClauses}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields before sending response (with fallbacks for legacy data)
    let parsedLocation: any = [];
    try {
      parsedLocation = Array.isArray(result.rows[0].location)
        ? result.rows[0].location
        : typeof result.rows[0].location === 'string'
          ? JSON.parse(result.rows[0].location)
          : [];
    } catch (e) {
      parsedLocation = typeof result.rows[0].location === 'string'
        ? [result.rows[0].location]
        : [];
    }

    let parsedImages: any = [];
    try {
      parsedImages = normalizeImages(result.rows[0].images);
    } catch (e) {
      parsedImages = [];
    }

    const vehicle = {
      ...result.rows[0],
      location: parsedLocation,
      images: parsedImages
    };

    return NextResponse.json({
      success: true,
      data: { vehicle }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}); 