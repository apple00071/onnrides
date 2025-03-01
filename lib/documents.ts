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
  try {
    // Use the API endpoint for document upload reminders
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'document-upload-reminder',
        data: {
          email,
          name,
          bookingId,
          uploadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile/documents`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@onnrides.com',
          deadline: '24 hours'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send document upload reminder');
    }
    
    logger.info('Document upload reminder sent:', { 
      email, 
      bookingId,
      template: 'document_upload_reminder' 
    });

    return true;
  } catch (error) {
    logger.error('Failed to send document upload reminder:', error);
    return false;
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
  try {
    const whatsappService = WhatsAppService.getInstance();
    
    // Send email confirmation using the API endpoint
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'booking-confirmation',
          data: {
            email: email,
            name: name,
            bookingId: bookingId,
            vehicleName: bookingDetails.vehicleName,
            startDate: bookingDetails.startDate,
            endDate: bookingDetails.endDate,
            amount: `₹${bookingDetails.totalAmount.toFixed(2)}`,
            paymentId: 'N/A' // No payment ID in this context
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email confirmation');
      }
      
      logger.info('Booking confirmation email sent:', { 
        email, 
        bookingId,
        template: 'booking_confirmation' 
      });
    } catch (error) {
      logger.error('Failed to send booking confirmation email:', error);
      // Continue execution even if email fails
    }

    // Send WhatsApp notification
    try {
      await whatsappService.sendMessage(
        phone,
        `🎉 Booking Confirmed!\n\nHi ${name},\n\nYour booking (ID: ${bookingId}) for ${bookingDetails.vehicleName} has been confirmed.\n\n⚠️ Important: Please upload required documents within 24 hours to avoid booking cancellation.\n\nUpload here: ${process.env.NEXT_PUBLIC_APP_URL}/profile/documents`
      );
      
      logger.info('WhatsApp notification sent:', { 
        phone, 
        bookingId
      });
    } catch (error) {
      logger.error('Failed to send WhatsApp notification:', error);
      // Continue execution even if WhatsApp fails
    }

    return true;
  } catch (error) {
    logger.error('Failed to send booking confirmation:', error);
    // Return false instead of throwing to prevent cascading failures
    return false;
  }
} 