import fs from 'fs';
import path from 'path';
import logger from './logger';

export function initializeDirectories() {
    const directories = [
        'logs',
        '.wwebjs_auth',
        '.wwebjs_cache'
    ];

    directories.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            } catch (error) {
                logger.error(`Failed to create directory ${dir}:`, error);
            }
        }
    });
} 