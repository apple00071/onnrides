import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin exists
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@onnrides.com' }
    });

    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await hash('admin123', 12);
    await prisma.user.create({
      data: {
        email: 'admin@onnrides.com',
        password_hash: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

createAdmin(); 