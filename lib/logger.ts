import winston from 'winston';
import 'winston-daily-rotate-file';

// Define log levels
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Create custom format
const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let formattedMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    formattedMessage += ` ${JSON.stringify(meta)}`;
  }
  return formattedMessage;
});

// Create transports based on environment
const getTransports = () => {
  const transports: winston.transport[] = [];

  // Always add console transport
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );

  // Add file transport only in Node.js environment and production
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    try {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    } catch (error) {
      console.warn('Failed to initialize file transport:', error);
    }
  }

  return transports;
};

// Create the logger instance with appropriate configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: getTransports()
});

// Browser-safe logging wrapper
const safeLogger = {
  error: (message: string, ...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.error(message, ...args);
    } else {
      logger.error(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.warn(message, ...args);
    } else {
      logger.warn(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.info(message, ...args);
    } else {
      logger.info(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.debug(message, ...args);
    } else {
      logger.debug(message, ...args);
    }
  }
};

export default safeLogger; 