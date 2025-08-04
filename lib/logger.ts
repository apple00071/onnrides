import winston from 'winston';
import 'winston-daily-rotate-file';
import edgeLogger, { Logger } from './edge-logger';

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
const devLogger: Logger = winston.createLogger({
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

// If we're in production or Edge runtime, use the edge logger
const logger = (process.env.NEXT_RUNTIME === 'edge' || process.env.NODE_ENV === 'production') 
    ? edgeLogger 
    : devLogger;

export type { Logger };
export default logger; 