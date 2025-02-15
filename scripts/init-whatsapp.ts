import { WhatsAppService } from '@/lib/whatsapp/service';
import logger from '@/lib/logger';

async function initWhatsApp(retries = 3) {
    logger.info('Starting WhatsApp initialization...');
    
    const whatsappService = WhatsAppService.getInstance();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await whatsappService.initialize();
            logger.info('WhatsApp initialization completed successfully');
            return;
        } catch (error) {
            logger.error(`WhatsApp initialization attempt ${attempt} failed:`, error);
            if (attempt === retries) {
                throw new Error(`Failed to initialize WhatsApp after ${retries} attempts`);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Run the initialization
if (require.main === module) {
    initWhatsApp()
        .then(() => {
            logger.info('WhatsApp service is ready');
        })
        .catch((error) => {
            logger.error('WhatsApp initialization failed:', error);
            process.exit(1);
        });
}

export default initWhatsApp; 