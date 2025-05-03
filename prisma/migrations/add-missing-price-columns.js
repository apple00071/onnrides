// This script adds missing price columns to the vehicles table
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding missing price columns to vehicles table...');
    
    // Execute raw SQL to add the missing columns
    await prisma.$executeRaw`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS price_7_days NUMERIC,
      ADD COLUMN IF NOT EXISTS price_15_days NUMERIC,
      ADD COLUMN IF NOT EXISTS price_30_days NUMERIC;
    `;
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 