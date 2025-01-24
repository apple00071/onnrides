import { Client } from 'pg';
import { createId } from '@paralleldrive/cuid2';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdmin() {
  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You should change this after first login
  // This is the bcrypt hash of 'admin123'
  const hashedPassword = '$2a$10$YEqFIQU3uN.4LGQEGz1kLOCxVkgfwZ.U0TUPyPrz0Oz.3u.Z0ZUXW';

  try {
    await client.connect();

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    await client.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [createId(), email, 'Admin', hashedPassword, 'admin']
    );

    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Please change the password after first login');
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

createAdmin(); 