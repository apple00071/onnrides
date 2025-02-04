import { migrate } from '../app/lib/migrations/003_add_payment_intent_id';
import { logger } from '@/lib/logger';

async function main() {
  try {
    logger.info('Starting migration process');
    await migrate();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 