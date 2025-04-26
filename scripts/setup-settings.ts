import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import logger from '../lib/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Setting up default settings...');
    
    // Check if maintenance_mode setting exists
    const existingMaintenanceMode = await prisma.settings.findUnique({
      where: { key: 'maintenance_mode' }
    });

    // Create maintenance_mode setting if it doesn't exist
    if (!existingMaintenanceMode) {
      await prisma.settings.create({
        data: {
          id: randomUUID(),
          key: 'maintenance_mode',
          value: 'false'
        }
      });
      logger.info('Created maintenance_mode setting with default value: false');
    } else {
      logger.info('maintenance_mode setting already exists with value:', existingMaintenanceMode.value);
    }

    logger.info('Settings setup complete!');
  } catch (error) {
    logger.error('Error setting up settings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Error in setup-settings script:', error);
    process.exit(1);
  }); 