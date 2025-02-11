import { NextResponse } from 'next/server';
import { sendBookingConfirmationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../../../../lib/email/service';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { type, data } = await req.json();

    switch (type) {
      case 'booking-confirmation':
        const { booking, userEmail } = data;
        await sendBookingConfirmationEmail(booking, userEmail);
        break;

      case 'password-reset':
        const { email, token } = data;
        await sendPasswordResetEmail(email, token);
        break;

      case 'welcome':
        const { welcomeEmail, name } = data;
        await sendWelcomeEmail(welcomeEmail, name);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 