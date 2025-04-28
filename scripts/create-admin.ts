import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.users.create({
      data: {
        name: 'Admin User',
        email: 'admin@onnrides.com',
        password_hash: adminPassword,
        role: 'admin',
        phone: '1234567890'
      }
    });

    console.log('Admin user created successfully:', admin.id);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 