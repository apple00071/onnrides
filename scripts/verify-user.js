const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  password: 'Sulochana8%',
  host: 'localhost',
  port: 5432,
  database: 'onnrides'
});

async function verifyUser() {
  const client = await pool.connect();
  
  try {
    const email = 'admin@onnrides.com';
    
    // Check if user exists and get their details
    const result = await client.query(
      'SELECT id, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('User does not exist in the database');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHashExists: !!user.password_hash
    });

    // Verify if profile exists
    const profileResult = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );
    
    console.log('Profile exists:', profileResult.rows.length > 0);
    
    // Test password verification
    const testPassword = 'admin123';
    const isValidPassword = await bcrypt.compare(testPassword, user.password_hash);
    console.log('Password verification:', isValidPassword);
    
  } catch (error) {
    console.error('Error verifying user:', error);
  } finally {
    client.release();
    pool.end();
  }
}

verifyUser(); 