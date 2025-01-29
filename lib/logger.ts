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
    // Here you could integrate with a production logging service
    // For now, we'll only log errors and warnings in production
    if (level === 'error' || level === 'warn') {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        level,
        data: args
      };
      
      // You could send this to a logging service
      // For now, we'll just do minimal console output in production
      if (level === 'error') {
        console.error('[Error]', timestamp, ...args);
      } else if (level === 'warn') {
        console.warn('[Warning]', timestamp, ...args);
      }
    }
  }
};

const logger = {
  debug: (...args: any[]): void => {
    if (shouldLog('debug')) {
      console.log('[Debug]', ...args);
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
      productionLog('error', errorMessage, ...args);
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

export { logger };
export default logger; 