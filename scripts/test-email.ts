import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

// Now import the modules that depend on environment variables
import { EmailService } from '../lib/email/service';
import logger from '../lib/logger';

async function testEmail() {
    try {
        logger.info('Starting email test...');
        logger.info('Email configuration:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            hasPassword: !!process.env.SMTP_PASS,
            from: process.env.SMTP_FROM
        });

        const emailService = EmailService.getInstance();
        
        // Send test email
        await emailService.sendEmail(
            'contact@onnrides.com', // Send to the GoDaddy email for testing
            'Test Email from OnnRides',
            `
            <h2>Test Email</h2>
            <p>This is a test email from OnnRides system.</p>
            <p>Time: ${new Date().toLocaleString()}</p>
            `,
            'TEST-' + Date.now()
        );
        
        logger.info('Test email sent successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to send test email:', error);
        process.exit(1);
    }
}

testEmail(); 