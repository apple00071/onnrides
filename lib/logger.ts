import winston from 'winston';
import 'winston-daily-rotate-file';

const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: any;
}

function formatMessage(level: LogLevel, message: string, metadata?: any): string {
  const timestamp = new Date().toISOString();
  const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metadataStr}`;
}

const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data ? data : '');
    }
  }
};

export default logger; 