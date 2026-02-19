
import { WhatsAppNotificationService } from '../lib/whatsapp/notification-service';
import logger from '../lib/logger';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConsolidatedNotification() {
    console.log('Testing consolidated notification...');

    const service = WhatsAppNotificationService.getInstance();
    const targetPhone = '8247494622';

    // Mock data matching the user's request (Booking + Payment)
    const mockData = {
        id: 'test-id-123',
        booking_id: 'ORLTEST',
        payment_id: 'pay_Test123456',
        amount: 150, // Advance
        total_amount: 3000,
        customer_name: 'Test Agent',
        phone_number: targetPhone,
        vehicle_model: 'Royal Enfield Classic 350',
        start_date: new Date(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        pickup_location: 'Madhapur Metro Station',
        status: 'confirmed'
    };

    try {
        console.log(`Sending to ${targetPhone}...`);
        const result = await service.sendBookingSuccessNotification(mockData);

        if (result) {
            console.log('✅ Notification sent successfully!');
        } else {
            console.error('❌ Failed to send notification.');
        }
    } catch (error) {
        console.error('Error executing test:', error);
    } finally {
        process.exit(0);
    }
}

testConsolidatedNotification();
