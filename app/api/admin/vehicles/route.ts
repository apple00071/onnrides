import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';
import { insertOne, findAll, deleteOne } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db';

export async function GET() {
  try {
    const vehicles = await findAll(COLLECTIONS.VEHICLES);
    return NextResponse.json(vehicles);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    logger.info('Received vehicle data:', data);
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_day'];
    for (const field of requiredFields) {
      if (!data[field]) {
        logger.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate price and quantity
    if (isNaN(data.price_per_day) || data.price_per_day <= 0) {
      logger.error('Invalid price:', data.price_per_day);
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    if (isNaN(data.quantity) || data.quantity <= 0) {
      logger.error('Invalid quantity:', data.quantity);
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Validate locations array
    if (!Array.isArray(data.location) || data.location.length === 0) {
      logger.error('Invalid locations:', data.location);
      return NextResponse.json(
        { error: 'Invalid locations format' },
        { status: 400 }
      );
    }

    const vehicleData = {
      id: nanoid(),
      name: data.name,
      type: data.type,
      location: JSON.stringify(data.location),
      quantity: data.quantity,
      price_per_day: data.price_per_day,
      is_available: 1,
      status: data.status || 'available',
      image_url: data.image_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    logger.info('Prepared vehicle data:', vehicleData);

    const vehicle = await insertOne(COLLECTIONS.VEHICLES, vehicleData);
    logger.info('Vehicle created:', vehicle);
    
    return NextResponse.json({
      ...vehicle,
      location: JSON.parse(vehicle.location as string),
      is_available: Boolean(vehicle.is_available)
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    // Log the full error details
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    await deleteOne(COLLECTIONS.VEHICLES, id);
    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 