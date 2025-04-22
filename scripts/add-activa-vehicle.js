const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Add an Activa 6G vehicle with the specific ID from the URL
    const activaVehicle = await prisma.vehicles.upsert({
      where: { id: 'f7560ae9-d64f-43ce-ab20-53ce7aa6cc97' },
      update: {
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1626236104392-c891035dd88a?q=80&w=1000&auto=format&fit=crop',
          'https://images.pexels.com/photos/13277151/pexels-photo-13277151.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/7519035/pexels-photo-7519035.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]),
        name: 'Activa 6G',
        price_per_hour: 21,
        is_available: true
      },
      create: {
        id: 'f7560ae9-d64f-43ce-ab20-53ce7aa6cc97',
        name: 'Activa 6G',
        type: 'bike',
        location: JSON.stringify(['Madhapur', 'Hyderabad']),
        quantity: 5,
        price_per_hour: 21,
        min_booking_hours: 4,
        price_7_days: 1999,
        price_15_days: 4199,
        price_30_days: 6499,
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1626236104392-c891035dd88a?q=80&w=1000&auto=format&fit=crop',
          'https://images.pexels.com/photos/13277151/pexels-photo-13277151.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/7519035/pexels-photo-7519035.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]),
        status: 'active',
        is_available: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('Activa 6G vehicle created/updated successfully:', activaVehicle);
  } catch (error) {
    console.error('Error creating Activa 6G vehicle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 