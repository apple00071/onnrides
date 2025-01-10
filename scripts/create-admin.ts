import logger from '@/lib/logger';

import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// Load environment variables
config();

async function createAdminUser() {
  
  try {
    logger.debug('Creating admin user...');

    // Hash the password
    
    
    

    // Check if admin user already exists
    

    if (checkResult.rows.length > 0) {
      logger.debug('Admin user already exists');
      return;
    }

    // Insert admin user
    

    

    // Insert admin profile
    await client.query(
      `INSERT INTO profiles (user_id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [userId, 'Admin', 'User']
    );

    logger.debug('Admin user created successfully');
    logger.debug('Email: admin@onnrides.com');
    logger.debug('Password: admin123');
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
  }
}

createAdminUser()
  .catch((err) => {
    logger.error('Failed to create admin user:', err);
    process.exit(1);
  }); 