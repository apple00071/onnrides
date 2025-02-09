import logger from '@/lib/logger';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const dirsToRemove = [
  'app/(main)/vehicles/[id]',
  'app/api/user/bookings/[id]',
  'app/api/user/vehicles/[id]',
  'app/api/vehicles/[id]'
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