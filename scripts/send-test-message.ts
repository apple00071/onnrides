import { WhatsAppService } from '@/app/lib/whatsapp/service';
import logger from '../lib/logger';

async function sendTestMessage() {
    try {
        logger.info('Sending test message...');
        const whatsappService = WhatsAppService.getInstance();
        
        // Initialize WhatsApp if not already initialized
        if (!whatsappService.getInitializationStatus().isInitialized) {
            logger.info('Initializing WhatsApp service...');
            await whatsappService.initialize();
        }
        
        // Send test message
        await whatsappService.sendMessage(
            '8247494622',
            'This is a test message from OnnRides. Please ignore.'
        );
        
        logger.info('Test message sent successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to send test message:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    sendTestMessage().catch(error => {
        logger.error('Script error:', error);
        process.exit(1);
    });
}

export default sendTestMessage; 