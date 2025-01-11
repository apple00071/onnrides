import { insertOne } from './db';
import { COLLECTIONS } from './db';
import bcrypt from 'bcryptjs';
import type { User } from './types';

export async function seedAdmin() {
  try {
    const adminData: Omit<User, 'id'> = {
      name: 'Admin',
      email: 'admin@onnrides.com',
      phone: '1234567890',
      role: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await insertOne(COLLECTIONS.USERS, adminData);
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run this function to seed the admin user
seedAdmin(); 