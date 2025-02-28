import winston from 'winston';
import 'winston-daily-rotate-file';

const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  metadata?: any;
}

function formatMessage(level: LogLevel, message: string, metadata?: any): string {
  const timestamp = new Date().toISOString();
  const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metadataStr}`;
}

// Simple logger that works in both Edge and Node.js environments
const logger = {
  info: (message: string, metadata?: any) => {
    const formattedMessage = formatMessage('info', message, metadata);
    console.log(formattedMessage);
  },
  error: (message: string, metadata?: any) => {
    const formattedMessage = formatMessage('error', message, metadata);
    console.error(formattedMessage);
  },
  warn: (message: string, metadata?: any) => {
    const formattedMessage = formatMessage('warn', message, metadata);
    console.warn(formattedMessage);
  },
  debug: (message: string, metadata?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = formatMessage('debug', message, metadata);
      console.debug(formattedMessage);
    }
  }
};

export default logger; 