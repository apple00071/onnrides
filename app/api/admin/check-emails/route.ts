import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS } from '@/lib/notifications/admin-notification';
import { query } from '@/lib/db';
import { EmailService } from '@/lib/email/service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API endpoint for checking email configuration and admin emails
 */
export async function GET(req: NextRequest) {
  try {
    // S-Verify: Added mandatory admin check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Get admin emails from environment
    const adminEmails = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : DEFAULT_ADMIN_EMAILS;

    // Get SMTP configuration
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      user: process.env.SMTP_USER || '',
      from: process.env.SMTP_FROM || '',
      // Don't expose the password, just indicate if it's set
      hasPassword: Boolean(process.env.SMTP_PASS),
    };

    // Check database connection
    let dbStatus = 'Unknown';
    try {
      const result = await query('SELECT NOW()');
      dbStatus = 'Connected, timestamp: ' + result.rows[0].now;
    } catch (dbError: any) {
      dbStatus = `Error: ${dbError.message}`;
    }

    // Check email logs table
    let emailLogsStatus = 'Unknown';
    try {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs'
        );
      `);

      if (result.rows[0].exists) {
        const columnsResult = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs';
        `);

        const columns = columnsResult.rows.map((row: any) => row.column_name);
        emailLogsStatus = `Table exists with columns: ${columns.join(', ')}`;
      } else {
        emailLogsStatus = 'Table does not exist';
      }
    } catch (emailLogsError: any) {
      emailLogsStatus = `Error: ${emailLogsError.message}`;
    }

    // Return configuration info
    return NextResponse.json({
      adminEmails,
      smtpConfig,
      dbStatus,
      emailLogsStatus,
      environment: process.env.NODE_ENV || 'unknown',
      server: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * API endpoint for sending a test email to admin
 */
export async function POST(req: NextRequest) {
  try {
    // S-Verify: Added mandatory admin check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Only allow in development mode (or strictly for admins if allowed in prod)
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
    }

    const adminEmails = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : DEFAULT_ADMIN_EMAILS;
    if (!adminEmails.length) {
      return NextResponse.json({ error: 'No admin emails configured' }, { status: 400 });
    }

    // Send a test email
    const testId = Math.random().toString(36).substring(2, 15);
    const emailService = EmailService.getInstance();

    const results = [];
    for (const email of adminEmails) {
      try {
        const { messageId, logId } = await emailService.sendEmail(
          email,
          `[ONNRIDES] Test Email ${testId}`,
          `
            <h1>Test Email</h1>
            <p>This is a test email from the ONNRIDES system.</p>
            <p>Test ID: ${testId}</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
          `
        );

        results.push({
          email,
          success: true,
          messageId,
          logId
        });
      } catch (err: any) {
        results.push({
          email,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${adminEmails.join(', ')}`,
      testId,
      results
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 