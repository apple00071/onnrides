import { hash } from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAdmin() {
  // Create a new password hash
  const password = 'admin123';
  const passwordHash = await hash(password, 12);

  // Create a connection pool using DIRECT_URL to bypass Prisma
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
  });

  try {
    // First delete any existing admin
    await pool.query('DELETE FROM users WHERE email = $1', ['admin@onnrides.com']);

    // Insert new admin
    const result = await pool.query(
      `INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        phone,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email`,
      [
        'admin_' + Date.now().toString(),
        'Admin',
        'admin@onnrides.com',
        passwordHash,
        'admin',
        '1234567890'
      ]
    );

    console.log('Admin user created successfully!');
    console.log('Email: admin@onnrides.com');
    console.log('Password: admin123');
    console.log('Generated password hash:', passwordHash);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin().catch(console.error); 