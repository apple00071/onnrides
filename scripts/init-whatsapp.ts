import logger from '@/lib/logger';
import { WhatsAppService } from '@/lib/whatsapp/service';

interface WhatsAppApiResponse {
    success: boolean;
    error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function initWhatsApp(retryCount = 0) {
    try {
        logger.info('Starting WhatsApp service initialization...', { retryCount });

        // First try to initialize the service directly
        const whatsappService = WhatsAppService.getInstance();
        await whatsappService.initialize();

        // Check initialization status
        const status = whatsappService.getInitializationStatus();
        if (!status.isInitialized) {
            throw new Error(status.error?.message || 'WhatsApp initialization failed');
        }

        // If direct initialization succeeds, we're done
        logger.info('WhatsApp service initialized successfully');
        return;

    } catch (directInitError) {
        logger.error('Direct WhatsApp initialization failed:', directInitError);

        // If we've exceeded max retries, try the API route as a last resort
        if (retryCount >= MAX_RETRIES) {
            logger.info('Maximum retries exceeded, attempting API route initialization...');
            try {
                const response = await fetch('http://localhost:3000/api/whatsapp/init');
                const data = await response.json() as WhatsAppApiResponse;
                
                if (!data.success) {
                    throw new Error(data.error || 'API initialization failed');
                }
                
                logger.info('WhatsApp initialization completed via API route');

                // Verify initialization
                const whatsappService = WhatsAppService.getInstance();
                const status = whatsappService.getInitializationStatus();
                
                if (!status.isInitialized) {
                    throw new Error('WhatsApp service failed to initialize properly');
                }

            } catch (apiInitError) {
                logger.error('Failed to initialize WhatsApp via API:', apiInitError);
                throw apiInitError;
            }
        } else {
            // Wait before retrying
            logger.info(`Retrying WhatsApp initialization in ${RETRY_DELAY}ms...`, {
                retryCount: retryCount + 1,
                maxRetries: MAX_RETRIES
            });
            await delay(RETRY_DELAY);
            return initWhatsApp(retryCount + 1);
        }
    }
}

// Only run in production and with proper delay to ensure server is ready
if (process.env.NODE_ENV === 'production') {
    logger.info('Scheduling WhatsApp initialization...');
    
    // Wait for the server to be fully started
    setTimeout(async () => {
        try {
            await initWhatsApp();
        } catch (error) {
            logger.error('WhatsApp initialization failed after all retries:', error);
            // You might want to add some notification mechanism here
            // to alert admins about the initialization failure
        }
    }, 10000); // Increased to 10 seconds to ensure server is fully ready 
} 