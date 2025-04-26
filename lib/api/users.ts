import { Pool } from 'pg';
import logger from '@/lib/logger';

// Define the User type
export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: Date;
};

/**
 * Get all users directly from the database
 * This is a fallback when Prisma has issues with type mismatches
 */
export async function getUsers(): Promise<User[]> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Direct SQL query to get users, converting any numeric IDs to strings
    const result = await pool.query(`
      SELECT 
        id::text, 
        name, 
        email, 
        phone, 
        role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at
    }));
  } catch (error) {
    logger.error('Error in direct database query for users:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Get a user by ID directly from the database
 */
export async function getUserById(id: string): Promise<User | null> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Try to find the user by ID, handling both UUID and numeric IDs
    const result = await pool.query(`
      SELECT 
        id::text, 
        name, 
        email, 
        phone, 
        role,
        created_at
      FROM users
      WHERE id::text = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at
    };
  } catch (error) {
    logger.error(`Error finding user by ID ${id}:`, error);
    return null;
  } finally {
    await pool.end();
  }
} 