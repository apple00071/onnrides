'use server';

import { WhatsAppService } from '@/app/lib/whatsapp/service';
import { User } from '@/lib/types';
import logger from '@/lib/logger';
import { formatIST } from '@/lib/utils/time-formatter';

export async function sendBookingNotification(
    user: User,
    bookingDetails: {
        vehicleName: string;
        startDate: string;
        endDate: string;
        bookingId: string;
        status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        totalPrice?: string;
    }
) {
    // Only skip WhatsApp integration in client-side
    if (typeof window !== 'undefined') {
        logger.info('Skipping WhatsApp notification in client environment');
        return true;
    }

    try {
        if (!user.phone) {
            logger.warn('Cannot send WhatsApp notification: User has no phone number', {
                userId: user.id,
                bookingId: bookingDetails.bookingId
            });
            return false;
        }

        const whatsappService = WhatsAppService.getInstance();
        await whatsappService.initialize();

        // Format date string if it's a Date object
        const formattedStartDate = typeof bookingDetails.startDate === 'object' 
            ? formatIST(bookingDetails.startDate)
            : bookingDetails.startDate;
            
        const formattedEndDate = typeof bookingDetails.endDate === 'object'
            ? formatIST(bookingDetails.endDate)
            : bookingDetails.endDate;

        switch (bookingDetails.status) {
            case 'confirmed':
                return await whatsappService.sendBookingConfirmation({
                    customerName: user.name || 'User',
                    customerPhone: user.phone,
                    vehicleType: 'Vehicle',
                    vehicleModel: bookingDetails.vehicleName,
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    bookingId: bookingDetails.bookingId
                });

            case 'cancelled':
                return await whatsappService.sendBookingCancellation(
                    user.phone,
                    user.name || 'User',
                    bookingDetails.vehicleName,
                    bookingDetails.bookingId
                );

            case 'pending':
                if (bookingDetails.totalPrice) {
                    return await whatsappService.sendPaymentConfirmation(
                        user.phone,
                        user.name || 'User',
                        bookingDetails.bookingId,
                        bookingDetails.totalPrice
                    );
                }
                break;

            default:
                logger.warn('Unhandled booking status for WhatsApp notification', {
                    status: bookingDetails.status,
                    bookingId: bookingDetails.bookingId
                });
                return false;
        }

        return false;
    } catch (error) {
        logger.error('Failed to send WhatsApp notification:', error);
        return false;
    }
} 