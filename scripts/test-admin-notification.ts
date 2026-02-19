
import { AdminNotificationService } from '../lib/notifications/admin-notification';
import logger from '../lib/logger';
import fs from 'fs';
import path from 'path';

async function testAdminNotification() {
    const logFile = path.join(process.cwd(), 'test-output.log');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        fs.writeFileSync(logFile, 'Starting Test...\n');
        log('Testing Admin Notification...');
        const service = AdminNotificationService.getInstance();

        // Log the configured phones (private method access via 'any' cast for debugging)
        const phones = (service as any).getAdminPhones();
        log(`Configured Admin Phones: ${JSON.stringify(phones)}`);

        const result = await service.sendNotification({
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification to verify admin WhatsApp delivery.',
            data: {
                test_id: '12345',
                timestamp: new Date()
            }
        });

        log(`Notification Result: ${JSON.stringify(result, null, 2)}`);

    } catch (error) {
        log(`Test Failed: ${error}`);
    }
}

testAdminNotification();
