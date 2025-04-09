import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSampleData() {
  try {
    console.log('Deleting sample data...');
    
    // Delete sample vehicle
    const deletedVehicle = await prisma.vehicles.deleteMany({
      where: {
        id: 'sample_vehicle_1'
      }
    });
    console.log(`Deleted ${deletedVehicle.count} sample vehicles`);
    
    // Delete sample location
    const deletedLocation = await prisma.locations.deleteMany({
      where: {
        id: '550e8400-e29b-41d4-a716-446655440000'
      }
    });
    console.log(`Deleted ${deletedLocation.count} sample locations`);
    
    // Delete sample settings
    const deletedSettings = await prisma.settings.deleteMany({
      where: {
        key: {
          in: ['maintenance_mode', 'site_name']
        }
      }
    });
    console.log(`Deleted ${deletedSettings.count} sample settings`);
    
    console.log('Sample data deletion completed successfully');
  } catch (error) {
    console.error('Error deleting sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSampleData(); 