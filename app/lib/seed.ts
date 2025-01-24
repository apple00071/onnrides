import { db } from '@/lib/db';
import { users, roleEnum } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seedAdmin() {
  try {
    const adminData = {
      id: uuidv4(),
      name: 'Admin',
      email: 'admin@onnrides.com',
      password_hash: await bcrypt.hash('admin123', 10),
      role: roleEnum.enumValues[1],
      is_blocked: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(users).values(adminData);
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run this function to seed the admin user
// seedAdmin(); 