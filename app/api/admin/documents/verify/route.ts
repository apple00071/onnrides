import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { documentId, status, rejectionReason } = await request.json();

        if (!documentId || !status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid request parameters' },
                { status: 400 }
            );
        }

        // Get document and user details
        const documentResult = await query(
            `SELECT d.*, u.email, u.name 
             FROM documents d 
             JOIN users u ON d.user_id = u.id 
             WHERE d.id = $1::uuid`,
            [documentId]
        );

        if (documentResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        const document = documentResult.rows[0];

        // Update document status
        const updateResult = await query(
            `UPDATE documents 
             SET status = $1::text, 
                 rejection_reason = $2,
                 updated_at = NOW()
             WHERE id = $3::uuid
             RETURNING *`,
            [status, rejectionReason || null, documentId]
        );

        // Send email notification
        try {
            const emailService = EmailService.getInstance();
            const emailData = {
                name: document.name || 'User',
                documentType: document.type,
                status,
                reason: rejectionReason,
                uploadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile/documents`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@onnrides.com'
            };

            const subject = status === 'approved'
                ? 'Document Verification Successful'
                : 'Document Verification Failed';

            const template = status === 'approved'
                ? `
                    <h2>Hello ${emailData.name},</h2>
                    <p>Great news! Your ${emailData.documentType} has been verified and approved.</p>
                    <p>You can now proceed with your bookings.</p>
                    <p>If you have any questions, please contact us at ${emailData.supportEmail}.</p>
                    <p>Best regards,<br>OnnRides Team</p>
                `
                : `
                    <h2>Hello ${emailData.name},</h2>
                    <p>We regret to inform you that your ${emailData.documentType} verification was unsuccessful.</p>
                    ${emailData.reason ? `<p>Reason: ${emailData.reason}</p>` : ''}
                    <p>Please upload a new document here: <a href="${emailData.uploadUrl}">${emailData.uploadUrl}</a></p>
                    <p>If you need assistance, please contact us at ${emailData.supportEmail}.</p>
                    <p>Best regards,<br>OnnRides Team</p>
                `;

            await emailService.sendEmail(document.email, subject, template);

            logger.info('Document verification email sent:', {
                documentId,
                userId: document.user_id,
                status
            });
        } catch (emailError) {
            logger.error('Failed to send document verification email:', emailError);
            // Don't fail the request if email fails
        }

        return NextResponse.json({
            success: true,
            message: `Document ${status} successfully`,
            document: updateResult.rows[0]
        });
    } catch (error) {
        logger.error('Error verifying document:', error);
        return NextResponse.json(
            { error: 'Failed to verify document' },
            { status: 500 }
        );
    }
} 