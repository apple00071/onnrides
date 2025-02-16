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
  info: (message: string, metadata?: any) => {
    if (!isProduction || !isBrowser) {
      console.log(formatMessage('info', message, metadata));
    }
  },
  error: (message: string, metadata?: any) => {
    console.error(formatMessage('error', message, metadata));
  },
  warn: (message: string, metadata?: any) => {
    console.warn(formatMessage('warn', message, metadata));
  },
  debug: (message: string, metadata?: any) => {
    if (!isProduction) {
      console.debug(formatMessage('debug', message, metadata));
    }
  }
};

export default logger; 