import { config } from 'dotenv';
import { resolve } from 'path';
import { logger } from '../lib/logger';

// Load environment variables from .env file
const envPath = resolve(__dirname, '../.env');
const result = config({ path: envPath });

if (result.error) {
  logger.error('Failed to load environment variables:', result.error);
  process.exit(1);
}

logger.info(`Loading environment variables from: ${envPath}`);

// Log environment variables for debugging (excluding sensitive data)
logger.info('Environment variables loaded:', {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_FROM: process.env.SMTP_FROM,
  has_SMTP_PASS: !!process.env.SMTP_PASS,
  NODE_ENV: process.env.NODE_ENV,
  pwd: process.cwd(),
  envPath
});

// Import email config after environment variables are loaded
import { verifyEmailConfig } from '../lib/email/config';

async function testEmailConfig() {
  logger.info('Starting email configuration test...');
  
  try {
    const result = await verifyEmailConfig();
    
    if (result) {
      logger.info('✅ Email configuration test passed successfully!');
      process.exit(0);
    } else {
      logger.error('❌ Email configuration test failed.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Email configuration test failed with error:', error);
    process.exit(1);
  }
}

testEmailConfig(); 