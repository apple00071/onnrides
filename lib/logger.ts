import winston from 'winston';
import 'winston-daily-rotate-file';

const isBrowser = typeof process === 'undefined';
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
const logger = isBrowser ? 
  // Browser logger
  {
    info: (...args: any[]) => console.log(...args),
    error: (...args: any[]) => console.error(...args),
    warn: (...args: any[]) => console.warn(...args),
    debug: (...args: any[]) => console.debug(...args)
  } :
  // Node.js logger
  winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

export default logger; 