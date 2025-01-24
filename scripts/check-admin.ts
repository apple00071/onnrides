import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdmin() {
  try {
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .execute();

    if (adminUsers.length === 0) {
      console.log('No admin users found in the database');
    } else {
      console.log('Found admin users:');
      adminUsers.forEach(user => {
        console.log(`- ${user.email} (${user.name})`);
      });
    }
  } catch (error) {
    console.error('Error checking admin users:', error);
  }
}

checkAdmin(); 