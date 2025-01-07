const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create a new pool using the connection string from the environment variable
const pool = new Pool({
  user: 'postgres',
  password: 'Sulochana8%',
  host: 'localhost',
  port: 5432,
  database: 'onnrides'
});

async function createAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if admin already exists
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@onnrides.com']
    );

    if (checkResult.rows.length > 0) {
      // Update admin password
      const passwordHash = await bcrypt.hash('admin123', 10);
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [passwordHash, 'admin@onnrides.com']
      );
      console.log('Admin password updated successfully');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash('admin123', 10);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        ['admin@onnrides.com', passwordHash, 'admin']
      );

      // Create admin profile
      await client.query(
        `INSERT INTO profiles (user_id, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userResult.rows[0].id, 'Admin', 'User']
      );

      console.log('Admin user created successfully');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating/updating admin:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 