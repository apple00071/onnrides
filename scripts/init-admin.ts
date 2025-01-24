import { db, createUser } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Checking for existing admin user...');
  
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@onnrides.com'))
    .limit(1);

  if (existingAdmin) {
    console.log('Admin user already exists');
    process.exit(0);
  }

  console.log('Creating admin user...');
  
  try {
    const admin = await createUser({
      email: 'admin@onnrides.com',
      password: 'admin123!@#',  // You should change this password after first login
      name: 'Admin',
      role: 'admin'
    });

    console.log('Admin user created successfully:', admin.id);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

main().catch(console.error); 