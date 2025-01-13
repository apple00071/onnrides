import Database from 'better-sqlite3';
import logger from '@/lib/logger';
import path from 'path';
import { nanoid } from 'nanoid';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'data', 'onnrides.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  DOCUMENTS: 'documents',
  PAYMENTS: 'payments'
} as const;

// Initialize database schema
function initializeDatabase() {
  // Create vehicles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COLLECTIONS.VEHICLES} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_day REAL NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COLLECTIONS.USERS} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_documents_verified BOOLEAN DEFAULT FALSE,
      documents_submitted BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COLLECTIONS.BOOKINGS} (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // Create documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COLLECTIONS.DOCUMENTS} (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COLLECTIONS.PAYMENTS} (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      transaction_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);
}

// Initialize database on startup
try {
  initializeDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Error initializing database:', error);
  throw error;
}

// Helper function to convert dates to ISO strings
function convertDatesToISOString(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Helper function to parse ISO strings back to dates
function parseDatesFromISOString(obj: any): any {
  const dateFields = ['created_at', 'updated_at', 'start_date', 'end_date'];
  const result = { ...obj };
  for (const field of dateFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = new Date(result[field]);
    }
  }
  return result;
}

// Generic database operations
export async function findAll<T>(collection: string): Promise<T[]> {
  try {
    const stmt = db.prepare(`SELECT * FROM ${collection}`);
    const results = stmt.all() as T[];
    return results.map(parseDatesFromISOString);
  } catch (error) {
    logger.error(`Error in findAll for ${collection}:`, error);
    throw error;
  }
}

export async function findOneBy<T>(collection: string, field: string, value: any): Promise<T | null> {
  try {
    const stmt = db.prepare(`SELECT * FROM ${collection} WHERE ${field} = ?`);
    const result = stmt.get(value) as T | null;
    return result ? parseDatesFromISOString(result) : null;
  } catch (error) {
    logger.error(`Error in findOneBy for ${collection}:`, error);
    throw error;
  }
}

export async function findManyBy<T>(collection: string, field: string, value: any): Promise<T[]> {
  try {
    const stmt = db.prepare(`SELECT * FROM ${collection} WHERE ${field} = ?`);
    const results = stmt.all(value) as T[];
    return results.map(parseDatesFromISOString);
  } catch (error) {
    logger.error(`Error in findManyBy for ${collection}:`, error);
    throw error;
  }
}

export async function insertOne<T extends { id?: string }>(collection: string, data: Partial<T>): Promise<T> {
  try {
    const id = data.id || `${collection.slice(0, 3)}_${nanoid()}`;
    const now = new Date().toISOString();
    const processedData = convertDatesToISOString({ 
      ...data, 
      id,
      created_at: now,
      updated_at: now
    });
    
    const fields = Object.keys(processedData);
    const values = Object.values(processedData);
    const placeholders = Array(fields.length).fill('?').join(', ');
    
    const stmt = db.prepare(`
      INSERT INTO ${collection} (${fields.join(', ')})
      VALUES (${placeholders})
    `);

    const result = stmt.run(...values);
    if (result.changes !== 1) {
      throw new Error('Failed to insert record');
    }

    return { ...processedData, id } as T;
  } catch (error) {
    logger.error(`Error in insertOne for ${collection}:`, error);
    throw error;
  }
}

export async function updateOne<T>(collection: string, id: string | number, data: Partial<T>): Promise<T | null> {
  try {
    const processedData = convertDatesToISOString({
      ...data,
      updated_at: new Date().toISOString()
    });
    
    const fields = Object.keys(processedData);
    const values = Object.values(processedData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = db.prepare(`
      UPDATE ${collection}
      SET ${setClause}
      WHERE id = ?
    `);

    const result = stmt.run(...values, id);
    if (result.changes !== 1) {
      return null;
    }

    return findOneBy<T>(collection, 'id', id);
  } catch (error) {
    logger.error(`Error in updateOne for ${collection}:`, error);
    throw error;
  }
}

export async function deleteOne(collection: string, id: string | number): Promise<boolean> {
  try {
    const stmt = db.prepare(`DELETE FROM ${collection} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes === 1;
  } catch (error) {
    logger.error(`Error in deleteOne for ${collection}:`, error);
    throw error;
  }
}

export async function countBy(collection: string, field: string, value: any): Promise<number> {
  try {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${collection} WHERE ${field} = ?`);
    const result = stmt.get(value) as { count: number };
    return result.count;
  } catch (error) {
    logger.error(`Error in countBy for ${collection}:`, error);
    throw error;
  }
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const stmt = db.prepare(query);
    const results = stmt.all(...params) as T[];
    return results.map(parseDatesFromISOString);
  } catch (error) {
    logger.error('Error in executeQuery:', error);
    throw error;
  }
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${nanoid()}`;
}

// Alias functions for backward compatibility
export async function get<T>(collection: string, field: string, value: any): Promise<T | null> {
  return findOneBy<T>(collection, field, value);
}

export async function update<T>(collection: string, id: string | number, data: Partial<T>): Promise<T | null> {
  return updateOne<T>(collection, id, data);
} 