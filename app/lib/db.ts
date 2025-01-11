import { Pool } from 'pg';
import logger from './logger';

// Parse connection string into connection object
function parseConnectionString(connectionString: string) {
  const regex = /^postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = connectionString.match(regex);
  if (!match) {
    throw new Error('Invalid connection string format');
  }
  const [, user, password, host, port, database] = match;
  return { user, password, host, port: parseInt(port), database };
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to database:', err);
  } else {
    logger.info('Successfully connected to database');
    release();
  }
});

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  DOCUMENTS: 'documents',
  PAYMENTS: 'payments'
} as const;

// Generic database operations
export async function findAll<T>(collection: string): Promise<T[]> {
  try {
    const result = await pool.query(`SELECT * FROM ${collection}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error in findAll for ${collection}:`, error);
    throw error;
  }
}

export async function findOneBy<T>(collection: string, field: string, value: any): Promise<T | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM ${collection} WHERE ${field} = $1 LIMIT 1`,
      [value]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error in findOneBy for ${collection}:`, error);
    throw error;
  }
}

export async function findManyBy<T>(collection: string, field: string, value: any): Promise<T[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM ${collection} WHERE ${field} = $1`,
      [value]
    );
    return result.rows;
  } catch (error) {
    logger.error(`Error in findManyBy for ${collection}:`, error);
    throw error;
  }
}

export async function insertOne<T>(collection: string, data: Partial<T>): Promise<T> {
  try {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await pool.query(
      `INSERT INTO ${collection} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Error in insertOne for ${collection}:`, error);
    throw error;
  }
}

export async function updateOne<T>(collection: string, id: string | number, data: Partial<T>): Promise<T | null> {
  try {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE ${collection} SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error in updateOne for ${collection}:`, error);
    throw error;
  }
}

export async function deleteOne(collection: string, id: string | number): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM ${collection} WHERE id = $1 RETURNING *`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logger.error(`Error in deleteOne for ${collection}:`, error);
    throw error;
  }
}

export async function countBy(collection: string, field: string, value: any): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM ${collection} WHERE ${field} = $1`,
      [value]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    logger.error(`Error in countBy for ${collection}:`, error);
    throw error;
  }
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Error in executeQuery:', error);
    throw error;
  }
}

// Alias functions for better readability
export const get = findOneBy;
export const set = insertOne;
export const update = updateOne;
export const remove = deleteOne;
export const findMany = findManyBy;

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default pool; 