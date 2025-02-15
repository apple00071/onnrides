import winston from 'winston';
import 'winston-daily-rotate-file';

const isBrowser = typeof window !== 'undefined';
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

type LoggerFunction = (...args: any[]) => void;

interface Logger {
  info: LoggerFunction;
  error: LoggerFunction;
  warn: LoggerFunction;
  debug: LoggerFunction;
}

// Create a unified logger that works in both browser and Node environments
const logger: Logger = (() => {
  if (isBrowser) {
    // Browser logger
    return {
      info: (...args: any[]) => console.log('[INFO]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      debug: (...args: any[]) => {
        if (!isProduction) {
          console.debug('[DEBUG]', ...args);
        }
      }
    };
  } else {
    // Node.js logger using Winston
    const winstonLogger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: isProduction ? productionFormat : developmentFormat,
      transports: [
        new winston.transports.Console({
          format: isProduction ? productionFormat : developmentFormat
        })
      ]
    });

    return {
      info: (message: string, ...meta: any[]) => winstonLogger.info(message, ...meta),
      error: (message: string, ...meta: any[]) => winstonLogger.error(message, ...meta),
      warn: (message: string, ...meta: any[]) => winstonLogger.warn(message, ...meta),
      debug: (message: string, ...meta: any[]) => winstonLogger.debug(message, ...meta)
    };
  }
})();

export default logger; 