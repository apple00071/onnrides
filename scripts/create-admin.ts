import { config } from 'dotenv';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// Load environment variables
config();

async function createAdminUser() {
  const client = await pool.connect();
  try {
    console.log('Creating admin user...');

    // Hash the password
    const password = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if admin user already exists
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@onnrides.com']
    );

    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Insert admin user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['admin@onnrides.com', passwordHash, 'admin']
    );

    const userId = userResult.rows[0].id;

    // Insert admin profile
    await client.query(
      `INSERT INTO profiles (user_id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [userId, 'Admin', 'User']
    );

    console.log('Admin user created successfully');
    console.log('Email: admin@onnrides.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
  }
}

createAdminUser()
  .catch((err) => {
    console.error('Failed to create admin user:', err);
    process.exit(1);
  }); 