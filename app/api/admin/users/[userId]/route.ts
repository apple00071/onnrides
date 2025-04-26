import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppService } from '@/app/lib/whatsapp/service';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1::uuid',
      [params.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { status, message } = await request.json();
    
    const result = await query(
      'UPDATE users SET status = $1::uuid, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid RETURNING *',
      [status, params.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    // Send WhatsApp notification if message is provided
    if (message && updatedUser.phone) {
      const whatsapp = WhatsAppService.getInstance();
      const notificationResult = await whatsapp.sendMessage(
        updatedUser.phone,
        message
      );
      
      logger.info(`Status notification sent to user ${params.userId}`, {
        messageId: notificationResult.messageId,
        status
      });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1::uuid RETURNING *',
      [params.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 