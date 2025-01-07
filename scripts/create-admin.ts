import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const adminEmail = 'admin@onnrides.com';
const adminPassword = 'admin123'; // You should change this in production

async function createAdminUser() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'onnrides',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    try {
      // Check if admin already exists
      const checkResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );

      if (checkResult.rows.length > 0) {
        console.log('Admin user already exists');
        return;
      }

      // Start transaction
      await client.query('BEGIN');

      // Hash password
      const password_hash = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [adminEmail, password_hash, 'admin']
      );

      // Create admin profile
      await client.query(
        'INSERT INTO profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
        [userResult.rows[0].id, 'Admin', 'User']
      );

      await client.query('COMMIT');
      console.log('Admin user created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser().catch(console.error); 