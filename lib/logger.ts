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

// Create custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

// Create custom format for development
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Configure the logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat
    })
  ]
});

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