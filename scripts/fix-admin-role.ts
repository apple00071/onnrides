import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminRole() {
  try {
    await prisma.user.updateMany({
      where: { role: 'ADMIN' },
      data: { role: 'admin' }
    });

    console.log('Admin role fixed successfully');
  } catch (error) {
    console.error('Error fixing admin role:', error);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

fixAdminRole(); 