import { logger } from '@/lib/logger';
/* eslint-disable no-console */
const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    logger.debug('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    logger.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    logger.error('[ERROR]', ...args);
  }
};

export default logger; 