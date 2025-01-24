import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function createAdmin() {
  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You should change this after first login

  try {
    // Check if admin already exists
    const existingAdmin = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    await sql`
      INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (
        ${createId()},
        ${email},
        'Admin',
        ${hashedPassword},
        'admin',
        NOW(),
        NOW()
      )
    `;

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