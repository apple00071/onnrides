import winston from 'winston';
import 'winston-daily-rotate-file';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

// Define log levels and colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'gray'
};

// Add colors to Winston
winston.addColors(colors);

// Create a custom format for browser-like output
const browserFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

// Create the logger instance
const logger = isBrowser ? 
    // Browser logger (console-based)
    {
        error: (...args: any[]) => console.error(...args),
        warn: (...args: any[]) => console.warn(...args),
        info: (...args: any[]) => console.info(...args),
        debug: isProduction ? () => {} : (...args: any[]) => console.debug(...args)
    } :
    // Node.js logger (Winston-based)
    winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        levels,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            browserFormat
        ),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ],
        // Prevent Winston from exiting on error
        exitOnError: false
    });

// Export a type-safe logger interface
export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

// Export the logger instance
export default logger as Logger; 