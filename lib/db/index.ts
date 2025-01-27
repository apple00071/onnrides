import { sql } from '@vercel/postgres';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// Load environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

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
  const result = await sql<DbUser>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return result.rows[0] || null;
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  const result = await sql<DbUser>`
    INSERT INTO users (id, name, email, password_hash, role) 
    VALUES (${createId()}, ${data.name || null}, ${data.email}, ${data.password_hash}, ${data.role || 'user'}) 
    RETURNING *
  `;
  return result.rows[0];
}

export { sql }; 