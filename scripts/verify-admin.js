const { Pool } = require('pg');

const pool = new Pool({
  user: "neondb_owner",
  password: "npg_6XQq8mjZWPAN",
  host: "ep-soft-lake-a8c1s7oz-pooler.eastus2.azure.neon.tech",
  port: 5432,
  database: "neondb",
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyAdmin() {
  try {
    const result = await pool.query(
      'SELECT u.*, p.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.email = $1',
      ['admin@onnrides.com']
    );
    console.log('Admin user:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verifyAdmin(); 