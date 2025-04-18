import { query } from '@/lib/db';
import logger from '@/lib/logger';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string | Date;
}

interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: Date;
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        CASE 
          WHEN is_blocked = true THEN 'blocked'
          ELSE 'active'
        END as status,
        created_at
      FROM users
      WHERE role != 'admin'
      ORDER BY created_at DESC
    `);

    return result.rows.map((user: DbUser) => ({
      ...user,
      created_at: user.created_at.toISOString()
    }));
  } catch (error) {
    logger.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
} 