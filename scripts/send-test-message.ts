import { WaSenderService } from '@/lib/whatsapp/wasender-service';
import logger from '../lib/logger';

async function sendTestMessage() {
    try {
        logger.info('Sending test message...');
        const waSender = WaSenderService.getInstance();

        // Send test message
        const result = await waSender.sendTextMessage('8247494622', 'Test message from OnnRides WaSender integration');

        if (result) {
            logger.info('Test message sent successfully');
            process.exit(0);
        } else {
            logger.error('Failed to send test message');
            process.exit(1);
        }
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