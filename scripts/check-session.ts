import { Pool } from 'pg';

async function checkSession() {
  const pool = new Pool({
    connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    // Check all users in the database
    const usersResult = await pool.query('SELECT id, email, role FROM users');
    console.log('All users in database:', usersResult.rows);

    // Check if there are any active sessions
    const sessionsResult = await pool.query('SELECT * FROM sessions');
    console.log('Active sessions:', sessionsResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSession(); 