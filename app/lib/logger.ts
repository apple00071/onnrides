import baseLogger from '@/lib/logger';
/* eslint-disable no-console */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface ErrorWithStack extends Error {
  stack?: string;
}

const formatError = (error: ErrorWithStack): string => {
  return `${error.message}\n${error.stack || ''}`;
};

const shouldLog = (level: LogLevel): boolean => {
  // In production, only show errors and warnings
  if (isProduction) {
    return level === 'error' || level === 'warn';
  }
  // In development, show all logs
  return isDevelopment;
};

const productionLog = (level: LogLevel, ...args: any[]): void => {
  if (isProduction) {
    if (level === 'error' || level === 'warn') {
      const timestamp = new Date().toISOString();
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');

      if (level === 'error') {
        baseLogger.error(`[Error] ${timestamp} ${message}`);
      } else if (level === 'warn') {
        baseLogger.warn(`[Warning] ${timestamp} ${message}`);
      }
    }
  }
};

export const logger = {
  debug: (...args: any[]): void => {
    if (shouldLog('debug')) {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      baseLogger.debug(message);
    }
  },
  log: (...args: any[]): void => {
    if (shouldLog('log')) {
      console.log(...args);
      productionLog('log', ...args);
    }
  },
  error: (error: Error | string, ...args: any[]): void => {
    if (shouldLog('error')) {
      const errorMessage = error instanceof Error ? formatError(error) : error;
      const additionalMessage = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      productionLog('error', `${errorMessage} ${additionalMessage}`);
    }
  },
  warn: (...args: any[]): void => {
    if (shouldLog('warn')) {
      productionLog('warn', ...args);
    }
  },
  info: (...args: any[]): void => {
    if (shouldLog('info')) {
      console.info('[Info]', ...args);
      productionLog('info', ...args);
    }
  }
}; 