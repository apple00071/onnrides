import { WhatsAppService } from '@/app/lib/whatsapp/service';
import logger from '@/lib/logger';

async function testWhatsApp() {
    try {
        logger.info('Starting WhatsApp test...');
        const whatsappService = WhatsAppService.getInstance();
        
        // Initialize the service
        await whatsappService.initialize();
        
        // Wait for initialization
        let attempts = 0;
        const maxAttempts = 60; // Wait up to 60 seconds
        
        while (attempts < maxAttempts) {
            const status = whatsappService.getInitializationStatus();
            logger.info('Checking WhatsApp status:', {
                isInitialized: status.isInitialized,
                hasError: !!status.error,
                attempt: attempts + 1
            });
            
            if (status.isInitialized) {
                break;
            }
            
            if (status.error) {
                logger.error('WhatsApp initialization error:', status.error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        const status = whatsappService.getInitializationStatus();
        if (!status.isInitialized) {
            throw new Error('WhatsApp service failed to initialize in time');
        }
        
        logger.info('WhatsApp service initialized successfully, sending test message...');
        
        // Send test message
        const phone = '8247494622';
        const result = await whatsappService.sendMessage(
            phone,
            'This is a test message from OnnRides. Please ignore.'
        );
        
        if (result) {
            logger.info('Test message sent successfully');
        } else {
            logger.error('Failed to send test message');
        }
        
    } catch (error) {
        logger.error('Error in WhatsApp test:', error);
        throw error; // Re-throw to see the full error
    }
}

// Run the test
testWhatsApp(); 