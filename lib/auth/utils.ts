import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import type { User, UserRole } from '@/lib/types';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = result.rows[0];

    if (!user) {
      logger.debug('User not found:', email);
      return null;
    }

    const isValid = await comparePasswords(password, user.password_hash || '');

    if (!isValid) {
      logger.debug('Invalid password for user:', email);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role as UserRole,
      phone: user.phone,
      created_at: user.created_at,
      is_blocked: user.is_blocked
    };
  } catch (error) {
    logger.error('Validate user error:', error);
    return null;
  }
}

export async function getCurrentUser(userId: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role as UserRole,
      phone: user.phone,
      created_at: user.created_at,
      is_blocked: user.is_blocked
    };
  } catch (error) {
    logger.error('Get current user error:', error);
    return null;
  }
} 