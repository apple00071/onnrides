import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import { users, vehicles, bookings, documents } from './schema';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import pool, { query } from '@/lib/db';

// Load environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

neonConfig.fetchConnectionCache = true;

// Create SQL client with explicit typing
const sql = neon(process.env.DATABASE_URL);

// Create the drizzle database instance
export const db = drizzle(sql);
export { pool, query };

// Export schema and types
export type {
  User,
  NewUser,
  Vehicle,
  NewVehicle,
  Booking,
  NewBooking,
  Document,
  NewDocument
} from './schema';

export { schema };

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'admin';
};

export type QueryResult<T> = {
  rows: T[];
};

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
};

export type NewDbUser = Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  const result = await query(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [createId(), data.name || null, data.email, data.password_hash, data.role || 'user']
  );
  return result.rows[0];
}

// Note: Neon DB handles connection pooling automatically through their serverless driver 