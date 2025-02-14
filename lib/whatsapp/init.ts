import logger from '../logger';
import { WhatsAppService } from './service';

export async function initializeWhatsAppService() {
    if (typeof window !== 'undefined') {
        logger.warn('WhatsApp service initialization attempted in browser environment');
        return;
    }

    try {
        const whatsappService = WhatsAppService.getInstance();
        await whatsappService.initialize();
        logger.info('WhatsApp service initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize WhatsApp service:', error);
        throw error;
    }
} 