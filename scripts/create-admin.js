const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
    try {
        const email = 'admin@onnrides.com';
        const password = 'OnnR@1139';
        const name = 'Admin';

        const hash = await bcrypt.hash(password, 10);
        const id = uuidv4();

        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            // Update existing user
            const result = await pool.query(
                'UPDATE users SET password_hash = $1, role = $2, name = $3, updated_at = NOW() WHERE email = $4 RETURNING id, email, role',
                [hash, 'admin', name, email]
            );
            console.log('Admin user updated:', result.rows[0]);
        } else {
            // Insert new user
            const result = await pool.query(
                'INSERT INTO users (id, name, email, password_hash, role, is_blocked, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, email, role',
                [id, name, email, hash, 'admin', false]
            );
            console.log('Admin user created:', result.rows[0]);
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        await pool.end();
        process.exit(1);
    }
}

createAdmin();
