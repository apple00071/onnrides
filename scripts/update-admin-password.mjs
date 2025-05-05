import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateAdminPassword() {
  const email = 'admin@onnrides.com';
  const password = 'admin123'; // You should change this after first login

  try {
    await client.connect();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update admin user's password
    const result = await client.query(
      `UPDATE users 
       SET password_hash = $1,
           updated_at = NOW()
       WHERE email = $2
       RETURNING id`,
      [hashedPassword, email]
    );

    if (result.rows.length > 0) {
      console.log('Admin password updated successfully');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Please change the password after first login');
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Failed to update admin password:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

updateAdminPassword(); 