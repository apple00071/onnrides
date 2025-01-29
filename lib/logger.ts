/* eslint-disable no-console */
const isDevelopment = process.env.NODE_ENV === 'development';
const showLogger = process.env.NEXT_PUBLIC_SHOW_LOGGER === 'true';
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'log' | 'error' | 'warn' | 'info';

interface ErrorWithStack extends Error {
  stack?: string;
}

const formatError = (error: ErrorWithStack): string => {
  return `${error.message}\n${error.stack || ''}`;
};

const shouldLog = (level: LogLevel): boolean => {
  if (isDevelopment) return true;
  if (showLogger) return true;
  return level === 'error'; // Always log errors in production
};

const productionLog = (...args: any[]): void => {
  if (isProduction) {
    // In production, you might want to send logs to a logging service
    // Example: sendToLoggingService(args);
  }
};

export const logger = {
  log: (...args: any[]): void => {
    if (shouldLog('log')) {
      console.log(...args);
      productionLog(...args);
    }
  },
  error: (error: Error | string, ...args: any[]): void => {
    if (shouldLog('error')) {
      const errorMessage = error instanceof Error ? formatError(error) : error;
      console.error(errorMessage, ...args);
      
      if (isProduction) {
        // In production, you might want to send errors to an error tracking service
        // Example: Sentry.captureException(error);
        productionLog('ERROR:', errorMessage, ...args);
      }
    }
  },
  warn: (...args: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(...args);
      productionLog(...args);
    }
  },
  info: (...args: any[]): void => {
    if (shouldLog('info')) {
      console.info(...args);
      productionLog(...args);
    }
  }
};

export default logger; 