import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();
    const emailService = EmailService.getInstance();

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
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 