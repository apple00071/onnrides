import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthResult {
  user: User;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    // Auth check is already correct, using getCurrentUser
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }

    const updateQuery = `
      UPDATE documents 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const document = await query(updateQuery, [status, params.documentId]);

    if (!document.rows.length) {
      return new NextResponse('Document not found', { status: 404 });
    }

    return NextResponse.json(document.rows[0]);
  } catch (error) {
    logger.error('Error updating document:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 