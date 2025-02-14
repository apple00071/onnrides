import logger from '@/lib/logger';

interface WhatsAppInitResponse {
    success: boolean;
    message?: string;
    error?: string;
}

async function initWhatsApp() {
    try {
        const response = await fetch('http://localhost:3000/api/whatsapp/init');
        const data = await response.json() as WhatsAppInitResponse;
        
        if (data.success) {
            logger.info('WhatsApp initialization triggered successfully');
        } else {
            logger.error('Failed to trigger WhatsApp initialization:', data.error || 'Unknown error');
        }
    } catch (error) {
        logger.error('Error triggering WhatsApp initialization:', error);
    }
}

// Only run in production
if (process.env.NODE_ENV === 'production') {
    // Wait for the server to be fully started
    setTimeout(() => {
        initWhatsApp();
    }, 5000); // Wait 5 seconds after server start
} 