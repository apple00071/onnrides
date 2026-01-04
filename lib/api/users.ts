import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Define the User type
export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: Date | null;
};

/**
 * Get all users using raw query
 */
export async function getUsers(): Promise<User[]> {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role::text as role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return result.rows.map((user: { id: string; name: string | null; email: string; phone: string | null; role: string; created_at: Date | null }) => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      role: user.role || 'user',
      created_at: user.created_at
    }));
  } catch (error) {
    logger.error('Error fetching users:', error);
    return [];
  }
}

/**
 * Get a user by ID using raw query
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role::text as role,
        created_at
      FROM users
      WHERE id = $1
    `, [id]);

    const user = result.rows[0];

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      role: user.role || 'user',
      created_at: user.created_at
    };
  } catch (error) {
    logger.error(`Error finding user by ID ${id}:`, error);
    return null;
  }
}