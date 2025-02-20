import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

async function restoreAdmin() {
  const prisma = new PrismaClient();

  try {
    // Create admin user with properly hashed password
    const adminPassword = await hash('admin123', 12);
    
    // First try to find if admin exists
    const existingAdmin = await prisma.users.findUnique({
      where: { email: 'admin@onnrides.com' }
    });

    if (existingAdmin) {
      // Update existing admin's password
      const updatedAdmin = await prisma.users.update({
        where: { email: 'admin@onnrides.com' },
        data: {
          password_hash: adminPassword
        }
      });
      console.log('Admin password updated successfully!');
    } else {
      // Create new admin user
      const admin = await prisma.users.create({
        data: {
          id: 'admin_' + Date.now().toString(),
          email: 'admin@onnrides.com',
          name: 'Admin',
          password_hash: adminPassword,
          role: 'admin',
          phone: '1234567890'
        },
      });
      console.log('Admin user created successfully!');
    }

    console.log('Admin credentials:');
    console.log('Email: admin@onnrides.com');
    console.log('Password: admin123');

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Database error:', error.message);
    } else {
      console.error('Error managing admin user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

restoreAdmin().catch(console.error); 