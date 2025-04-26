const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function checkPrismaSettings() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set');
  
  try {
    console.log('Creating Prisma client...');
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    console.log('Checking for settings table...');
    try {
      const settings = await prisma.settings.findMany();
      console.log('Settings found through Prisma:', settings);
    } catch (error) {
      console.error('Error accessing settings through Prisma:', error);
      
      if (error.code === 'P2021') {
        console.log('\nTable not found error detected. Checking database tables...');
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        console.log('Tables in database:', tables);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error with Prisma client:', error);
  }
}

checkPrismaSettings().catch(console.error); 