import logger from '@/lib/logger';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const dirsToRemove = [
  'app/(main)/vehicles/[vehicleId]',
  'app/api/user/bookings/[bookingId]',
  'app/api/user/vehicles/[vehicleId]',
  'app/api/vehicles/[vehicleId]'
];

dirsToRemove.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      rimraf.sync(dir);
      logger.debug(`Successfully removed ${dir}`);
    } catch (error) {
      logger.error(`Error removing ${dir}:`, error);
    }
  } else {
    logger.debug(`Directory ${dir} does not exist`);
  }
}); 