require('dotenv').config();
const { sql } = require('@vercel/postgres');

async function checkSchema() {
  try {
    const result = await sql.query('SELECT * FROM vehicles LIMIT 0');
    console.log('Columns in vehicles table:', result.fields.map(f => f.name));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema(); 