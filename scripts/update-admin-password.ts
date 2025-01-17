import { db } from '../lib/db';
import { users } from '../lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL is not set in environment variables');
}

const client = postgres(connectionString);
const database = drizzle(client);

async function updateAdminPassword() {
  try {
    // Default admin password
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update admin user's password
    await database
      .update(users)
      .set({ 
        password_hash: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(users.email, 'admin@onnrides.com'));

    console.log('Admin password updated successfully');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    await client.end();
    process.exit(1);
  }
}

updateAdminPassword(); 