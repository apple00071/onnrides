import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import { users } from './schema';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'admin';
};

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user;
}

export async function createUser(input: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(input.password, 10);
  
  const [user] = await db
    .insert(users)
    .values({
      id: createId(),
      email: input.email,
      name: input.name,
      password_hash: hashedPassword,
      role: input.role || 'user',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  
  return user;
}

// Note: Neon DB handles connection pooling automatically through their serverless driver 