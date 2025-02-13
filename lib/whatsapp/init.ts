import { initializeWhatsApp } from './config';
import logger from '../logger';

export async function initializeWhatsAppService() {
    try {
        await initializeWhatsApp();
        logger.info('WhatsApp service initialized successfully');
        
        // Set initialization flag in WhatsAppService
        const WhatsAppService = (await import('./service')).WhatsAppService;
        const instance = WhatsAppService.getInstance();
        (instance as any).isInitialized = true;
        
    } catch (error) {
        logger.error('Failed to initialize WhatsApp service:', error);
        throw error;
    }
} 