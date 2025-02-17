'use server';

import { WhatsAppService } from './service';
import { User } from '@/lib/types';
import logger from '@/lib/logger';

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
        const formattedDate = new Date(bookingDetails.startDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        switch (bookingDetails.status) {
            case 'confirmed':
                return await whatsappService.sendBookingConfirmation(
                    user.phone,
                    user.name || 'User',
                    bookingDetails.vehicleName,
                    formattedDate
                );

            case 'cancelled':
                return await whatsappService.sendBookingCancellation(
                    user.phone,
                    user.name || 'User',
                    bookingDetails.vehicleName
                );

            case 'pending':
                if (bookingDetails.totalPrice) {
                    return await whatsappService.sendPaymentConfirmation(
                        user.phone,
                        user.name || 'User',
                        bookingDetails.totalPrice,
                        bookingDetails.bookingId
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