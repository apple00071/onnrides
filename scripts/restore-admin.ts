import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { query } from '../lib/db';
import logger from '../lib/logger';

async function restoreAdmin() {
  try {
    logger.info('Checking for admin user...');

    // Check if admin exists
    const result = await query(`
      SELECT id, email, role FROM users 
      WHERE email = $1 
      LIMIT 1
    `, ['admin@onnrides.com']);

    const adminExists = result.rows.length > 0;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await hash(adminPassword, 10);

    if (adminExists) {
      // Update existing admin
      await query(`
        UPDATE users 
        SET 
          password = $1,
          role = 'admin',
          updated_at = NOW()
        WHERE email = $2
      `, [hashedPassword, 'admin@onnrides.com']);

      logger.info('✅ Admin user updated successfully');
    } else {
      // Create new admin
      await query(`
        INSERT INTO users (
          id, 
          email, 
          password, 
          name,
          role,
          email_verified,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
      `, [
        randomUUID(),
        'admin@onnrides.com',
        hashedPassword,
        'Admin',
        'admin',
        true
      ]);

      logger.info('✅ Admin user created successfully');
    }
  } catch (error) {
    logger.error('Error restoring admin:', error);
    process.exit(1);
  }
}

// Run the restore
restoreAdmin(); 