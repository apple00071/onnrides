// Simple logger that works in both Edge and Node.js environments
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  info: (message: string, meta?: any) => {
    if (!isProduction || message.startsWith('[ERROR]') || message.startsWith('[CRITICAL]')) {
      console.log(`[INFO] ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: any) => {
    if (!isProduction || message.startsWith('[ERROR]') || message.startsWith('[CRITICAL]')) {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  },
  error: (message: string, meta?: any) => {
    // Always log errors
    console.error(`[ERROR] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    // Never log debug in production
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }
};

export type Logger = typeof logger;
export default logger; 