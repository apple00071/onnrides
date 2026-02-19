
import { AdminNotificationService } from '../lib/notifications/admin-notification';
import logger from '../lib/logger';

// Mock logger to verify order
const originalInfo = logger.info;
logger.info = (msg, meta) => {
    console.log(`[LOG] ${msg}`, meta ? JSON.stringify(meta) : '');
    originalInfo(msg, meta);
};

async function testPriorityNotification() {
    console.log('Testing Priority Notification...');
    const service = AdminNotificationService.getInstance();

    // Note: This test relies on the configured environment variables.
    // It expects 9182495481 to be in the list.

    console.log('Sending notification...');
    const start = Date.now();

    const result = await service.sendNotification({
        type: 'test',
        title: 'Priority Test',
        message: 'Testing priority delivery logic.',
        data: { timestamp: new Date() }
    });

    const end = Date.now();
    console.log(`Initial send completed in ${end - start}ms`);
    console.log('Result:', JSON.stringify(result, null, 2));

    console.log('Waiting for background tasks (simulated)...');
    // We won't actually wait 65s in this script unless we want to, 
    // but we should see the "Scheduling..." log in the output above.
}

testPriorityNotification();
