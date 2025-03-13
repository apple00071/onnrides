import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { EmailService } from '@/lib/email/service';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Validate UUID format
function isValidUUID(uuid: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get email log ID from request body
        const { logId } = await request.json();
        if (!logId) {
            return NextResponse.json(
                { success: false, message: 'Email log ID is required' },
                { status: 400 }
            );
        }

        // Validate UUID format
        if (!isValidUUID(logId)) {
            return NextResponse.json(
                { success: false, message: 'Invalid email log ID format' },
                { status: 400 }
            );
        }

        // Fetch the original email log
        const emailLog = await query(
            'SELECT * FROM email_logs WHERE id = $1',
            [logId]
        );

        if (emailLog.rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Email log not found' },
                { status: 404 }
            );
        }

        const log = emailLog.rows[0];
        logger.info('Resending email from log:', {
            logId,
            recipient: log.recipient,
            subject: log.subject
        });

        // Initialize email service
        const emailService = EmailService.getInstance();
        
        try {
            // Resend the email
            const { messageId, logId: newLogId } = await emailService.sendEmail(
                log.recipient,
                log.subject,
                log.message_content,
                log.booking_id
            );

            logger.info('Email resent successfully', {
                originalLogId: logId,
                newLogId,
                messageId,
                recipient: log.recipient
            });

            return NextResponse.json({
                success: true,
                message: 'Email resent successfully',
                data: {
                    originalLogId: logId,
                    newLogId,
                    messageId
                }
            });
        } catch (error) {
            logger.error('Failed to resend email:', {
                error,
                logId,
                recipient: log.recipient
            });

            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Failed to resend email',
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            );
        }
    } catch (error) {
        logger.error('Error in resend endpoint:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'Server error while processing resend request',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 