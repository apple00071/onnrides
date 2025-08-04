export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

const isProduction = process.env.NODE_ENV === 'production';

const logger: Logger = {
    error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta || '');
    },
    info: (message: string, meta?: any) => {
        console.info(`[INFO] ${message}`, meta || '');
    },
    debug: (message: string, meta?: any) => {
        if (!isProduction) {
            console.debug(`[DEBUG] ${message}`, meta || '');
        }
    }
};

export default logger; 