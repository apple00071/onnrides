import fs from 'fs';
import path from 'path';
import logger from './logger';

const requiredDirs = [
    'data',
    'data/auth',
    'logs'
];

export const initializeDirectories = () => {
    const baseDir = process.cwd();

    for (const dir of requiredDirs) {
        const fullPath = path.join(baseDir, dir);
        
        if (!fs.existsSync(fullPath)) {
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            } catch (error) {
                logger.error(`Failed to create directory ${dir}:`, error);
                throw error;
            }
        }
    }

    logger.info('Directory initialization completed');
}; 