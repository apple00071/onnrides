import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from 'crypto';
import type { NewVehicle, Vehicle } from '@/lib/schema';

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  location: string;
  quantity: number;
  pricePerHour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  minBookingHours: number;
  images: string;
  status: string;
  isAvailable: boolean;
  is_delivery_enabled: boolean;
  delivery_price_7_days: number | null;
  delivery_price_15_days: number | null;
  delivery_price_30_days: number | null;
  createdAt: Date;
  updatedAt: Date;
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

export async function GET(_request: NextRequest) {
  try {
    const result = await query(`
      SELECT * FROM vehicles 
      ORDER BY "createdAt"
    `);

    const formattedVehicles = result.rows.map((vehicle: VehicleRow) => {
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
      const images = normalizeImages(vehicle.images);

      return {
        ...vehicle,
        location: locations,
        images: images,
      };
    });

    return NextResponse.json({ vehicles: formattedVehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the raw request to help debug
    const rawData = await request.text();
    logger.info('Raw request data:', { rawData });
    
    // Parse the JSON data
    const data = JSON.parse(rawData);
    logger.info('Received vehicle creation request:', { 
      data, 
      keys: Object.keys(data),
      pricePerHour: data.pricePerHour,
      pricePerHourType: typeof data.pricePerHour
    });
    
    // Enhanced validation with more specific error messages
    const missingFields = [];
    if (!data.name) missingFields.push('name');
    if (!data.type) missingFields.push('type');
    
    // More thorough check for pricePerHour - catches undefined, null, empty string, and NaN
    if (
      data.pricePerHour === undefined || 
      data.pricePerHour === null || 
      data.pricePerHour === '' || 
      isNaN(Number(data.pricePerHour))
    ) {
      missingFields.push('pricePerHour');
      logger.warn('pricePerHour validation failed:', { 
        value: data.pricePerHour, 
        type: typeof data.pricePerHour,
        isNaN: isNaN(Number(data.pricePerHour))
      });
    }
    
    // Handle different possible formats of location data
    const hasValidLocation = (
      data.location && 
      (
        (typeof data.location === 'string' && data.location.trim() !== '') || 
        (Array.isArray(data.location) && data.location.length > 0) ||
        (typeof data.location === 'object' && Object.keys(data.location).length > 0)
      )
    );
    
    if (!hasValidLocation) {
      missingFields.push('location');
    }
    
    if (missingFields.length > 0) {
      logger.warn(`Missing required fields: ${missingFields.join(', ')}`, { 
        data,
        dataKeys: Object.keys(data) 
      });
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize images before saving
    const normalizedImages = normalizeImages(data.images);
    logger.debug('Normalized images:', { normalizedImages });

    // Ensure location is properly formatted
    let location = data.location;
    if (typeof location === 'string') {
      // If it's a single location, convert to array
      location = [location];
    } else if (Array.isArray(location)) {
      // If it's already an array, clean it
      location = location.map(loc => loc.trim()).filter(Boolean);
    } else if (typeof location === 'object' && location.name) {
      // If it's an object with name property, extract locations
      location = Array.isArray(location.name) ? location.name : [location.name];
    }

    // Convert location array to JSON string
    const locationJson = JSON.stringify(location);

    try {
      // Create the vehicle with normalized images
      const result = await query(`
        INSERT INTO vehicles (
          id, name, type, location, quantity, 
          "pricePerHour", price_7_days, price_15_days, price_30_days, 
          "minBookingHours", images, status, "isAvailable",
          "is_delivery_enabled", "delivery_price_7_days", "delivery_price_15_days", "delivery_price_30_days",
          "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id::text, name, type, location, quantity, 
          "pricePerHour", price_7_days, price_15_days, price_30_days, 
          "minBookingHours", images, status, "isAvailable",
          "is_delivery_enabled", "delivery_price_7_days", "delivery_price_15_days", "delivery_price_30_days",
          "createdAt", "updatedAt"
      `, [
        randomUUID(),
        data.name,
        data.type,
        locationJson,
        Number(data.quantity) || 1,
        Number(data.pricePerHour),
        data.price_7_days ? Number(data.price_7_days) : null,
        data.price_15_days ? Number(data.price_15_days) : null,
        data.price_30_days ? Number(data.price_30_days) : null,
        Number(data.minBookingHours) || 1,
        JSON.stringify(normalizedImages),
        data.status || 'active',
        true,
        data.is_delivery_enabled || false,
        data.delivery_price_7_days ? Number(data.delivery_price_7_days) : null,
        data.delivery_price_15_days ? Number(data.delivery_price_15_days) : null,
        data.delivery_price_30_days ? Number(data.delivery_price_30_days) : null,
        new Date(),
        new Date()
      ]);

      const vehicle = result.rows[0] as VehicleRow;

      logger.info('Vehicle created successfully:', { 
        vehicleId: vehicle.id,
        imageCount: normalizedImages.length
      });

      // Format the response
      const formattedVehicle = {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: normalizedImages // Use normalized images directly
      };

      return NextResponse.json({
        success: true,
        data: {
          vehicle: formattedVehicle
        }
      });
    } catch (dbError: any) {
      logger.error('Database error creating vehicle:', {
        error: dbError,
        message: dbError.message,
        data
      });
      throw new Error(`Database error: ${dbError.message}`);
    }
  } catch (error: any) {
    logger.error('Error creating vehicle:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to create vehicle: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    // Process numeric fields
    if (updateData.pricePerHour) {
      updateData.pricePerHour = Number(updateData.pricePerHour);
    }
    if (updateData.quantity) {
      updateData.quantity = Number(updateData.quantity);
    }
    if (updateData.minBookingHours) {
      updateData.minBookingHours = Number(updateData.minBookingHours);
    }
    
    // Handle special pricing fields
    updateData.price_7_days = updateData.price_7_days ? Number(updateData.price_7_days) : null;
    updateData.price_15_days = updateData.price_15_days ? Number(updateData.price_15_days) : null;
    updateData.price_30_days = updateData.price_30_days ? Number(updateData.price_30_days) : null;

    // Handle delivery pricing fields
    if (updateData.hasOwnProperty('delivery_price_7_days')) {
      updateData.delivery_price_7_days = updateData.delivery_price_7_days ? Number(updateData.delivery_price_7_days) : null;
    }
    if (updateData.hasOwnProperty('delivery_price_15_days')) {
      updateData.delivery_price_15_days = updateData.delivery_price_15_days ? Number(updateData.delivery_price_15_days) : null;
    }
    if (updateData.hasOwnProperty('delivery_price_30_days')) {
      updateData.delivery_price_30_days = updateData.delivery_price_30_days ? Number(updateData.delivery_price_30_days) : null;
    }

    // Handle is_delivery_enabled flag
    if (updateData.hasOwnProperty('is_delivery_enabled')) {
      updateData.is_delivery_enabled = Boolean(updateData.is_delivery_enabled);
    }

    // Ensure location is properly formatted
    if (updateData.location) {
      let location = updateData.location;
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
    if (updateData.images) {
      updateData.images = JSON.stringify(updateData.images);
    }

    const setClauses = Object.entries(updateData)
      .map(([key, value], index) => `${key} = $${index + 2}`)
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

    // Parse JSON fields before sending response
    const vehicle = {
      ...result.rows[0],
      location: JSON.parse(result.rows[0].location),
      images: JSON.parse(result.rows[0].images)
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
} 