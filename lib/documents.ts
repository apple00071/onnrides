import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';

export async function checkDocumentVerification(userId: string): Promise<{
  isVerified: boolean;
  hasDocuments: boolean;
  pendingDocuments: boolean;
}> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_documents,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_documents
       FROM documents 
       WHERE user_id = $1`,
      [userId]
    );

    const { total_documents, approved_documents, pending_documents } = result.rows[0];

    return {
      isVerified: approved_documents > 0,
      hasDocuments: total_documents > 0,
      pendingDocuments: pending_documents > 0
    };
  } catch (error) {
    logger.error('Error checking document verification:', error);
    throw error;
  }
}

export async function sendDocumentUploadReminder(
  email: string,
  name: string,
  bookingId: string
) {
  const emailService = EmailService.getInstance();
  
  try {
    await emailService.sendEmail(
      email,
      'Document Upload Required for Your Booking',
      'document_upload_reminder',
      {
        name,
        bookingId,
        uploadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile/documents`
      }
    );

    logger.info('Document upload reminder sent:', { email, bookingId });
  } catch (error) {
    logger.error('Failed to send document upload reminder:', error);
    throw error;
  }
}

export async function sendBookingConfirmationAndRequirements(
  email: string,
  phone: string,
  name: string,
  bookingId: string,
  bookingDetails: {
    vehicleName: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
  }
) {
  const emailService = EmailService.getInstance();
  const whatsappService = WhatsAppService.getInstance();
  
  try {
    // Send email confirmation
    await emailService.sendEmail(
      email,
      'Booking Confirmation and Document Requirements',
      'booking_confirmation_template',
    );

    // Send WhatsApp notification
    await whatsappService.sendMessage(
      phone,
      `🎉 Booking Confirmed!\n\nHi ${name},\n\nYour booking (ID: ${bookingId}) for ${bookingDetails.vehicleName} has been confirmed.\n\n⚠️ Important: Please upload required documents within 24 hours to avoid booking cancellation.\n\nUpload here: ${process.env.NEXT_PUBLIC_APP_URL}/profile/documents`
    );

    logger.info('Booking confirmation sent:', { email, bookingId });
  } catch (error) {
    logger.error('Failed to send booking confirmation:', error);
    throw error;
  }
} 