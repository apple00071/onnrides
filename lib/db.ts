import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.PGUSER || 'neondb_owner',
  password: process.env.PGPASSWORD || 'fpBXEsTct9g1',
  host: process.env.PGHOST_UNPOOLED || 'ep-long-dream-a6avbuml.us-west-2.aws.neon.tech',
  database: process.env.PGDATABASE || 'neondb',
  ssl: true
});

export default pool; 