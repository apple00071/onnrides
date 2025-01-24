import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import * as dotenv from 'dotenv';
import type { User } from '@/lib/db/schema';

dotenv.config();

async function createAdmin() {
  try {
    // Check if admin exists
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin')) as User[];

    if (adminUsers.length > 0) {
      console.log('Admin user already exists:', adminUsers[0].email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const result = await db.insert(users)
      .values({
        id: createId(),
        email: 'admin@onnrides.com',
        name: 'Admin',
        password_hash: hashedPassword,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning() as User[];

    const newAdmin = result[0];
    console.log('Admin user created successfully:', newAdmin.email);
    console.log('Default password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdmin(); 