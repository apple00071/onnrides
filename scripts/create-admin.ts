import 'dotenv/config';
import { db } from '../app/lib/lib/db';
import { users } from '../app/lib/lib/schema';
import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function createAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(sql`${users.email} = 'admin@onnrides.com'`);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.insert(users).values({
      id: randomUUID(),
      name: 'Admin User',
      email: 'admin@onnrides.com',
      password_hash: passwordHash,
      role: 'admin',
    });

    console.log('Admin user created successfully');
    console.log('Email: admin@onnrides.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin(); 