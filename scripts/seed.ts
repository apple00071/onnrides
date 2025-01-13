import { insertOne, COLLECTIONS } from '../app/lib/db';
import bcrypt from 'bcryptjs';
import type { User } from '../app/lib/types';

async function seedAdmin() {
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

    const result = await insertOne<User>(COLLECTIONS.USERS, adminData);
    console.log('Admin user created successfully:', result);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

async function main() {
  console.log('Starting seed process...');
  await seedAdmin();
  console.log('Seed process completed.');
}

main().catch(console.error); 