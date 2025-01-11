const { Pool } = require('pg');

const pool = new Pool({
  user: "neondb_owner",
  password: "fpBXEsTct9g1",
  host: "ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech",
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