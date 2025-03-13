import { WhatsAppService } from '@/app/lib/whatsapp/service';
import logger from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';

const SESSION_DIR = './whatsapp-sessions';

async function initWhatsApp() {
    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    logger.info('Starting WhatsApp initialization...');
    const whatsappService = WhatsAppService.getInstance();

    try {
        // Set up QR code handler
        whatsappService.onQRCode((qr) => {
            // Display QR in terminal
            qrcode.generate(qr, { small: true });
            
            // Save QR to file for backup
            const qrPath = path.join(SESSION_DIR, 'last-qr.txt');
            fs.writeFileSync(qrPath, qr);
            
            logger.info('WhatsApp QR Code generated!');
            logger.info('Please scan the QR code above with your WhatsApp app');
            logger.info(`QR code also saved to: ${qrPath}`);
        });

        // Set up ready handler
        whatsappService.onReady(() => {
            logger.info('WhatsApp client is authenticated and ready!');
            logger.info('Session data saved. You can now use WhatsApp in production.');
            
            // Optional: Send a test message
            whatsappService.sendMessage('YOUR_PHONE_NUMBER', 'WhatsApp initialization successful!')
                .then(() => {
                    logger.info('Test message sent successfully');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Failed to send test message:', error);
                    process.exit(1);
                });
        });

        // Initialize the service
        await whatsappService.initialize();

    } catch (error) {
        logger.error('Failed to initialize WhatsApp:', error);
        process.exit(1);
    }
}

// Run the initialization
if (require.main === module) {
    initWhatsApp().catch((error) => {
        logger.error('Script error:', error);
        process.exit(1);
    });
}

export default initWhatsApp; 