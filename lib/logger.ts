import winston from 'winston';
import 'winston-daily-rotate-file';

const isBrowser = typeof process === 'undefined' || !process.versions || !process.versions.node;
const isProduction = process.env.NODE_ENV === 'production';

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

// Configure the logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: []
});

// Add console transport for development
if (!isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add file transport for production server environment
if (!isBrowser && isProduction) {
  logger.add(
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  );
}

// Browser-safe logging methods
const browserLogger = {
  error: (message: string, ...meta: any[]) => {
    if (isBrowser) {
      console.error(message, ...meta);
    } else {
      logger.error(message, ...meta);
    }
  },
  warn: (message: string, ...meta: any[]) => {
    if (isBrowser) {
      console.warn(message, ...meta);
    } else {
      logger.warn(message, ...meta);
    }
  },
  info: (message: string, ...meta: any[]) => {
    if (isBrowser) {
      console.info(message, ...meta);
    } else {
      logger.info(message, ...meta);
    }
  },
  debug: (message: string, ...meta: any[]) => {
    if (isBrowser) {
      console.debug(message, ...meta);
    } else {
      logger.debug(message, ...meta);
    }
  }
};

export default browserLogger; 