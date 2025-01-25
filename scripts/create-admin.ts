import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

async function createAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You can change this password
  
  try {
    await client.connect();

    // Check if admin exists
    const existingAdmin = await client.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingAdmin.rows.length > 0) {
      // Update admin password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [passwordHash, email]
      );
      
      console.log('✅ Admin password updated successfully');
    } else {
      // Create new admin
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [randomUUID(), email, 'Admin', passwordHash, 'admin']
      );
      
      console.log('✅ Admin user created successfully');
    }

    console.log('Admin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Failed to create/update admin:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

createAdmin(); 