import { config } from 'dotenv';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// Load environment variables
config();

async function createAdminUser() {
  // Create a new pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });

  try {
    // Hash the password
    const password = 'admin123'; // You can change this password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const userId = randomUUID();
    const result = await pool.query(
      `INSERT INTO users (
        id,
        name,
        email,
        role,
        password_hash,
        created_at,
        updated_at,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING id, email`,
      [
        userId,
        'Admin User',
        'admin@onnrides.com',
        'admin',
        hashedPassword
      ]
    );

    console.log('Admin user created successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser(); 