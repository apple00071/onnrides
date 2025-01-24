import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import { users, vehicles, bookings, documents } from './schema';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'admin';
};

export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export async function createUser(input: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(input.password, 10);
  
  const result = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name || '',  // Provide default empty string for optional field
      password_hash: hashedPassword,
      role: input.role || 'user',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  
  return result[0];
}

// Note: Neon DB handles connection pooling automatically through their serverless driver 