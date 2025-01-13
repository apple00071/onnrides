import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/lib/auth';
import { db } from '@/app/lib/lib/db';
import { vehicles } from '@/app/lib/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all vehicles from the database
    const allVehicles = await db.select().from(vehicles);

    return NextResponse.json(allVehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the vehicle data from the request body
    const vehicleData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'type', 'quantity', 'price_per_day'];
    for (const field of requiredFields) {
      if (!vehicleData[field]) {
        return new NextResponse(`Missing required field: ${field}`, { status: 400 });
      }
    }

    // Insert the vehicle into the database
    const [newVehicle] = await db.insert(vehicles).values({
      name: vehicleData.name,
      type: vehicleData.type,
      quantity: vehicleData.quantity,
      price_per_day: vehicleData.price_per_day,
      image_url: vehicleData.image_url || '/cars/default.jpg',
      is_available: true,
      status: 'active'
    }).returning();

    return NextResponse.json(newVehicle);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the vehicle data and ID from the request body
    const { id, ...updateData } = await request.json();
    if (!id) {
      return new NextResponse('Vehicle ID is required', { status: 400 });
    }

    // Update the vehicle in the database
    const [updatedVehicle] = await db.update(vehicles)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(vehicles.id, id))
      .returning();

    if (!updatedVehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the vehicle ID from the request URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Vehicle ID is required', { status: 400 });
    }

    // Delete the vehicle from the database
    const [deletedVehicle] = await db.delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning();

    if (!deletedVehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 