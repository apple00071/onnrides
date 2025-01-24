import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { createId } from '@paralleldrive/cuid2';
import * as dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You should change this after first login

  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await argon2.hash(password);
    
    await db.insert(users).values({
      id: createId(),
      email,
      name: 'Admin',
      password_hash: hashedPassword,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Please change the password after first login');
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin(); 