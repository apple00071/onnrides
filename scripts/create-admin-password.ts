import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const hash = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hash);
  logger.debug('Hashed password:', hash);
}

// Replace 'your-admin-password' with your desired password
hashPassword('your-admin-password'); 