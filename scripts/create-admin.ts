import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🚀 Creating admin user...');

    // Check if admin exists
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@onnrides.com' }
    });

    if (adminExists) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@onnrides.com');
      console.log('🔑 Password: admin123');
      console.log('👤 User ID:', adminExists.id);
      console.log('🎭 Role:', adminExists.role);
      return;
    }

    // Create admin user
    const hashedPassword = await hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@onnrides.com',
        password_hash: hashedPassword,
        name: 'Admin User',
        phone: '+919876543210',
        role: 'admin', // Using lowercase 'admin' as per schema
        email_verified: new Date(),
        phone_verified: true,
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@onnrides.com');
    console.log('🔑 Password: admin123');
    console.log('👤 User ID:', admin.id);
    console.log('🎭 Role:', admin.role);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

createAdmin(); 