// scripts/add-test-vehicle.js
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function main() {
  try {
    // Add a test vehicle with a proper image URL
    const testVehicle = await prisma.vehicles.upsert({
      where: { id: 'test_vehicle_image' },
      update: {
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop',
          'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]),
        name: 'Test Honda City',
        price_per_hour: 100,
        is_available: true
      },
      create: {
        id: 'test_vehicle_image',
        name: 'Test Honda City',
        type: 'car',
        location: JSON.stringify(['Hyderabad', 'Madhapur']),
        quantity: 2,
        price_per_hour: 100,
        min_booking_hours: 4,
        price_7_days: 5000,
        price_15_days: 9000,
        price_30_days: 17000,
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop',
          'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]),
        status: 'active',
        is_available: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('Test vehicle created/updated successfully:', testVehicle);
  } catch (error) {
    console.error('Error creating test vehicle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 