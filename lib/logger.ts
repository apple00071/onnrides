import winston from 'winston';
import 'winston-daily-rotate-file';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Create a browser-compatible logger
const browserLogger = {
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  info: (...args: any[]) => console.info(...args),
  debug: (...args: any[]) => console.debug(...args),
};

// Create the server logger only in Node.js environment
const createServerLogger = () => {
  if (typeof window !== 'undefined') {
    return browserLogger;
  }

  try {
    // Add colors to Winston
    winston.addColors(colors);

    // Create formatters
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => {
          const { timestamp, level, message, metadata } = info;
          const metaStr = metadata && typeof metadata === 'object' && Object.keys(metadata).length
            ? '\n' + JSON.stringify(metadata, null, 2)
            : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        }
      )
    );

    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.json()
    );

    // Create transports array
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug',
      })
    ];

    // Add file transports only in Node.js environment
    try {
      const DailyRotateFile = require('winston-daily-rotate-file').default;
      
      // Rotating file transport for all logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'debug',
        }) as unknown as winston.transport,
        // Separate file for error logs
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }) as unknown as winston.transport
      );
    } catch (error) {
      console.error('Failed to initialize file transports:', error);
    }

    // Create the logger
    return winston.createLogger({
      levels,
      format: fileFormat,
      transports,
      // Add metadata to all logs
      defaultMeta: {
        service: 'onnrides-api',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    console.error('Failed to initialize winston logger:', error);
    return browserLogger;
  }
};

// Export the appropriate logger based on the environment
const logger = createServerLogger();

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger; 