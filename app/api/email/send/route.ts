import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check if the EmailService is properly initialized
    const emailService = EmailService.getInstance();
    const status = emailService.getInitializationStatus();
    
    if (!status.initialized) {
      logger.error('Email service not initialized when attempting to send email', {
        error: status.error?.message || 'Unknown initialization error'
      });
      return NextResponse.json(
        { 
          error: 'Email service not properly initialized', 
          details: status.error?.message || 'Unknown initialization error'
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    if (!body || !body.type || !body.data) {
      logger.error('Invalid email request body', { body });
      return NextResponse.json(
        { error: 'Invalid request body. Must include type and data.' },
        { status: 400 }
      );
    }

    const { type, data } = body;
    
    logger.info('Processing email request', { 
      type,
      recipient: data.email,
      metadata: {
        bookingId: data.bookingId,
        name: data.name
      }
    });

    switch (type) {
      case 'welcome':
        await emailService.sendEmail(
          data.email,
          'Welcome to OnnRides',
          `
            <h2>Welcome to OnnRides!</h2>
            <p>Hello ${data.name},</p>
            <p>Thank you for joining OnnRides. We're excited to have you on board!</p>
            <p>You can now start booking vehicles and exploring our services.</p>
          `
        );
        logger.info('Welcome email sent successfully', { recipient: data.email });
        break;

      case 'booking-confirmation':
        await emailService.sendBookingConfirmation(
          data.email,
          {
            userName: data.name,
            vehicleName: data.vehicleName,
            bookingId: data.bookingId,
            startDate: data.startDate,
            endDate: data.endDate,
            amount: data.amount,
            paymentId: data.paymentId
          }
        );
        logger.info('Booking confirmation email sent successfully', { 
          recipient: data.email,
          bookingId: data.bookingId
        });
        break;

      case 'document-upload-reminder':
        await emailService.sendDocumentUploadReminder(
          data.email,
          {
            name: data.name,
            bookingId: data.bookingId,
            uploadUrl: data.uploadUrl,
            supportEmail: data.supportEmail,
            deadline: data.deadline
          }
        );
        logger.info('Document upload reminder email sent successfully', {
          recipient: data.email,
          bookingId: data.bookingId
        });
        break;

      case 'password_reset':
        await emailService.sendEmail(
          data.email,
          'Password Reset - OnnRides',
          `
            <h2>Password Reset</h2>
            <p>Hello ${data.name},</p>
            <p>We received a request to reset your password. Click the link below to set a new password:</p>
            <p><a href="${data.resetLink}">${data.resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this change, please ignore this email or contact support.</p>
          `
        );
        logger.info('Password reset email sent successfully', { recipient: data.email });
        break;

      default:
        logger.warn('Invalid email type requested', { type });
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error sending email:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 