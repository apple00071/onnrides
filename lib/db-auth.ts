import { query } from '@/lib/db';
import { compare } from 'bcryptjs';
import logger from '@/lib/logger';

export async function findUserByEmail(email: string) {
  try {
    const result = await query(
      'SELECT id, name, email, password, role, "isBlocked" FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    return null;
  }
}

export async function validateUserPassword(plainPassword: string, hashedPassword: string) {
  try {
    return await compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
} 