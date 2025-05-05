import { Client } from 'pg';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    await client.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [randomUUID(), email, 'Admin', hashedPassword, 'admin']
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