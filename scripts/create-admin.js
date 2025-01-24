const { db } = require('../lib/db');
const { users } = require('../lib/db/schema');
const { eq } = require('drizzle-orm');
const argon2 = require('argon2');
const { createId } = require('@paralleldrive/cuid2');
require('dotenv').config();

async function createAdmin() {
  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You should change this after first login

  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await argon2.hash(password);
    
    await db.insert(users).values({
      id: createId(),
      email,
      name: 'Admin',
      password_hash: hashedPassword,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Please change the password after first login');
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin(); 