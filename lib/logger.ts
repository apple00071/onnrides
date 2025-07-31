// Simple logger implementation that works in all environments
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
    error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${message}`, meta ? meta : '');
    },
    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta ? meta : '');
    },
    info: (message: string, meta?: any) => {
        console.info(`[INFO] ${message}`, meta ? meta : '');
    },
    debug: (message: string, meta?: any) => {
        if (!isProduction) {
            console.debug(`[DEBUG] ${message}`, meta ? meta : '');
        }
    }
};

// Export a type-safe logger interface
export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

// Export the logger instance
export default logger as Logger; 