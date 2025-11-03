const { PrismaClient } = require('@prisma/client');

async function checkMaintenanceMode() {
  const prisma = new PrismaClient();
  
  try {
    // Check the maintenance mode setting
    const maintenanceSetting = await prisma.settings.findUnique({
      where: { key: 'maintenance_mode' },
      select: { value: true }
    });

    console.log('Maintenance mode setting:', maintenanceSetting);
    
    if (maintenanceSetting) {
      console.log('Maintenance mode is currently:', maintenanceSetting.value === 'true' ? 'ON' : 'OFF');
    } else {
      console.log('Maintenance mode setting not found in the database');
    }
    
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaintenanceMode();
