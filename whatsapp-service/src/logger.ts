import winston from 'winston';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Custom format for development
const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += '\n' + JSON.stringify(metadata, null, 2);
        }
        return msg;
    })
);

// Custom format for production
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: isProduction ? productionFormat : developmentFormat,
    transports: [
        // Console transport
        new winston.transports.Console(),
        
        // File transport for errors
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

export default logger; 