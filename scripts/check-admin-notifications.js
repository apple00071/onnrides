// Script to check AdminNotification records
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminNotifications() {
  try {
    console.log('Checking AdminNotification table...');
    
    // Check if table exists by attempting to count records
    try {
      const count = await prisma.adminNotification.count();
      console.log(`Total admin notifications: ${count}`);
      
      if (count > 0) {
        // Get the most recent notifications
        const notifications = await prisma.adminNotification.findMany({
          take: 10,
          orderBy: { created_at: 'desc' }
        });
        
        console.log('\nMost recent admin notifications:');
        notifications.forEach(n => {
          console.log(`\nID: ${n.id}`);
          console.log(`Type: ${n.type}`);
          console.log(`Title: ${n.title}`);
          console.log(`Recipient: ${n.recipient}`);
          console.log(`Channel: ${n.channel}`);
          console.log(`Status: ${n.status}`);
          console.log(`Created: ${n.created_at}`);
          if (n.error) console.log(`Error: ${n.error}`);
        });
        
        // Count by status
        const statusCounts = await prisma.adminNotification.groupBy({
          by: ['status'],
          _count: { status: true }
        });
        
        console.log('\nNotifications by status:');
        statusCounts.forEach(s => {
          console.log(`${s.status}: ${s._count.status}`);
        });
        
        // Count by type
        const typeCounts = await prisma.adminNotification.groupBy({
          by: ['type'],
          _count: { type: true }
        });
        
        console.log('\nNotifications by type:');
        typeCounts.forEach(t => {
          console.log(`${t.type}: ${t._count.type}`);
        });
      } else {
        console.log('No admin notifications found in the database.');
      }
    } catch (tableError) {
      console.error('Error accessing AdminNotification table:', tableError.message);
      console.log('The AdminNotification table might not exist or the migration might not have been applied.');
      console.log('Run: npx prisma migrate dev --name add_admin_notification');
    }
  } catch (error) {
    console.error('Error checking admin notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkAdminNotifications(); 