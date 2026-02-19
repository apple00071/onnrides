
import { WaSenderService } from '../lib/whatsapp/wasender-service';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debugWaSender() {
    console.log('Debugging WaSender...');

    const service = WaSenderService.getInstance();

    // Test numbers from env
    const phones = ['8247494622', '9182495481'];

    for (const phone of phones) {
        console.log(`\nSending to ${phone}...`);
        try {
            const result = await service.sendTextMessage(phone, 'Debug test message from OnnRides Admin Panel');
            console.log(`Result for ${phone}:`, result);

            // Add delay
            if (phones.indexOf(phone) < phones.length - 1) {
                console.log('Waiting 2s...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error) {
            console.error(`Error for ${phone}:`, error);
        }
    }
}

debugWaSender();
