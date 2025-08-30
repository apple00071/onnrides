import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { formatISOWithTZ } from '@/lib/utils/timezone';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { EmailService } from '@/lib/email/service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Calculate hours difference between two dates
function calculateHours(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  return hours;
}

// Generate a random secure password
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password using bcrypt
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      vehicleId,
      startDate,
      endDate,
      totalAmount,
      rentalAmount,
      securityDeposit,
      paidAmount,
      paymentMethod,
      paymentStatus,
      paymentReference,
      notes,
      signature,
      bookingLocation
    } = body;

    // Start a transaction
    await query('BEGIN');

    try {
      // Create or get user
      let userId;
      const existingUser = await query(
        'SELECT id FROM users WHERE phone = $1',
        [customerPhone]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
      } else {
        // Generate a random password and hash it
        const randomPassword = generateSecurePassword();
        const hashedPassword = await hashPassword(randomPassword);

        const newUser = await query(
          `INSERT INTO users (
            id,
            name, 
            phone, 
            email, 
            password_hash,
            role,
            created_at,
            updated_at
          )
           VALUES (
            gen_random_uuid(),
            $1, $2, $3, $4, 'user',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
           )
           RETURNING id`,
          [customerName, customerPhone, customerEmail, hashedPassword]
        );
        userId = newUser.rows[0].id;

        logger.info('Created new offline user:', {
          userId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail
        });
      }

      // Generate booking ID
      const bookingCountResult = await query(
        'SELECT COUNT(*) as count FROM bookings'
      );
      const count = parseInt(bookingCountResult.rows[0].count) + 1;
      const bookingId = `OR${count.toString().padStart(3, '0')}`;

      // Calculate total_hours
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      const totalHours = calculateHours(startDateTime, endDateTime);

      // Create payment details JSON
      const paymentDetails = JSON.stringify({
        method: paymentMethod,
        reference: paymentReference,
        rental_amount: rentalAmount,
        security_deposit: securityDeposit,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        notes,
        signature,
        location: bookingLocation
      });

      // Create booking
      const bookingResult = await query(
        `INSERT INTO bookings (
          id,
          booking_id,
          user_id,
          vehicle_id,
          start_date,
          end_date,
          total_hours,
          total_price,
          security_deposit,
          status,
          payment_status,
          payment_details,
          booking_type,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP
        )
        RETURNING id`,
        [
          bookingId,
          userId,
          vehicleId,
          formatISOWithTZ(startDateTime),
          formatISOWithTZ(endDateTime),
          totalHours,
          totalAmount,
          securityDeposit,
          'confirmed',
          paymentStatus,
          paymentDetails,
          'offline'
        ]
      );

      // Get vehicle details for notifications
      const vehicleResult = await query(
        'SELECT name FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      const vehicleName = vehicleResult.rows[0]?.name || 'Unknown Vehicle';

      // Send notifications asynchronously
      Promise.all([
        // Send WhatsApp notification
        (async () => {
          try {
            const whatsappService = WhatsAppService.getInstance();
            await whatsappService.sendBookingConfirmation({
              customerName,
              customerPhone,
              vehicleType: 'Vehicle',
              vehicleModel: vehicleName,
              startDate: startDateTime.toLocaleString(),
              endDate: endDateTime.toLocaleString(),
              bookingId,
              totalAmount: totalAmount.toString(),
            });
          } catch (error) {
            logger.warn('WhatsApp notification failed:', error);
          }
        })(),

        // Send email confirmation if email is provided
        (async () => {
          if (customerEmail) {
            try {
              const emailService = EmailService.getInstance();
              await emailService.sendBookingConfirmation(customerEmail, {
                userName: customerName,
                vehicleName,
                bookingId,
                startDate: startDateTime.toLocaleString(),
                endDate: endDateTime.toLocaleString(),
                amount: totalAmount.toString(),
                paymentId: paymentReference || 'N/A'
              });
            } catch (error) {
              logger.warn('Email notification failed:', error);
            }
          }
        })()
      ]).catch(error => {
        logger.warn('Notifications failed:', error);
      });

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Offline booking created successfully',
        data: {
          bookingId,
          id: bookingResult.rows[0].id,
          totalHours,
          booking: {
            id: bookingResult.rows[0].id,
            vehicle_name: vehicleName,
            user_name: customerName,
            user_email: customerEmail,
            user_phone: customerPhone,
            formatted_pickup: startDateTime.toLocaleString(),
            formatted_dropoff: endDateTime.toLocaleString()
          }
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error creating offline booking:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create offline booking'
      },
      { status: 500 }
    );
  }
} 