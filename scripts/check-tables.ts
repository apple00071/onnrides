import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Check bookings count
    const bookingsCount = await prisma.bookings.count();
    console.log(`Bookings count: ${bookingsCount}`);
    
    // Check users count
    const usersCount = await prisma.users.count();
    console.log(`Users count: ${usersCount}`);
    
    // Check vehicles count
    const vehiclesCount = await prisma.vehicles.count();
    console.log(`Vehicles count: ${vehiclesCount}`);
    
    // Get some sample data if available
    if (bookingsCount > 0) {
      const sampleBookings = await prisma.bookings.findMany({
        take: 3,
        select: {
          id: true,
          booking_id: true,
          status: true,
          created_at: true
        }
      });
      console.log('Sample bookings:', JSON.stringify(sampleBookings, null, 2));
    }
    
    if (vehiclesCount > 0) {
      const sampleVehicles = await prisma.vehicles.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          type: true,
          status: true
        }
      });
      console.log('Sample vehicles:', JSON.stringify(sampleVehicles, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 