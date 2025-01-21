import { db } from '../lib/db';
import { users } from '../lib/schema';
import { hashPassword } from '../lib/auth';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  try {
    console.log('Creating admin user...');

    const adminEmail = 'admin@onnrides.com';
    const adminPassword = 'admin123'; // You should change this in production

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const now = new Date().toISOString();

    const [admin] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: adminEmail,
        name: 'Admin',
        password_hash: hashedPassword,
        role: 'admin',
        created_at: now,
        updated_at: now,
      })
      .returning();

    console.log('Admin user created successfully:', {
      id: admin.id,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdmin(); 