import logger from '@/lib/logger';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';

export async function seedAdmin() {
  try {
    const adminId = createId();
    const passwordHash = await bcrypt.hash('admin123', 10);

    await query(
      `INSERT INTO users (id, name, email, password_hash, role, is_blocked, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'Admin', 'admin@onnrides.com', passwordHash, 'admin', false, new Date(), new Date()]
    );

    logger.debug('Admin user created successfully');
  } catch (error) {
    logger.error('Error creating admin user:', error);
  }
}

// Run this function to seed the admin user
// seedAdmin();